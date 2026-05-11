
import { getTinyOrders } from "./tiny";
import { normalizeProduct } from "./product-utils";
import { ProductSales } from "./tiny-products";

export interface SellerSales {
    sellerName: string;
    revenue: number;
    quantity: number;
}

/**
 * Extract the "Intermediador" field value from a Tiny order detail.
 * The field structure varies by Tiny version/config.
 */
function getIntermediadorValue(pedido: any): string {
    // Flat string
    if (typeof pedido.intermediador === 'string' && pedido.intermediador.trim()) {
        return pedido.intermediador.trim();
    }
    // Nested object (e.g. {nome: "B2B"})
    if (pedido.intermediador?.nome) return pedido.intermediador.nome.trim();
    if (pedido.intermediador?.nomeIntermediador) return pedido.intermediador.nomeIntermediador.trim();
    if (pedido.intermediador?.descricao) return pedido.intermediador.descricao.trim();
    // Flat alternative field names
    if (pedido.nome_intermediador) return pedido.nome_intermediador.trim();
    // Ecommerce sub-object
    if (pedido.ecommerce?.nomeIntermediador) return pedido.ecommerce.nomeIntermediador.trim();
    return '';
}

/**
 * Extract marcadores (tags) from a Tiny order detail as an array of strings.
 */
function getMarcadores(pedido: any): string[] {
    const raw = pedido.marcadores || pedido.tags || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => {
        if (typeof t === 'string') return t.trim();
        // Tiny nests: {marcador: {descricao: "..."}} or flat {descricao: "..."}
        const m = t.marcador || t;
        return (m.descricao || m.nome || m.tag || '').toString().trim();
    }).filter(Boolean);
}

/**
 * Classify an order as B2B or B2C based on:
 * 1. Intermediador field value  →  B2B / B2C / VENDA ONLINE
 * 2. Marcadores (tags)          →  B2B INTERNO / LOJA / ONLINE
 * 3. Fallback: CNPJ-based detection (legacy)
 */
function classifyOrder(
    pedido: any,
    isCNPJ: (v: string) => boolean,
    B2B_SELLERS: string[]
): 'b2b' | 'b2c' {
    // Priority 1: Intermediador field
    const intermediador = getIntermediadorValue(pedido);
    if (intermediador) {
        const val = intermediador.toUpperCase();
        if (val === 'B2B') return 'b2b';
        if (val === 'B2C' || val === 'VENDA ONLINE') return 'b2c';
    }

    // Priority 2: Marcadores
    const tags = getMarcadores(pedido);
    for (const tag of tags) {
        const val = tag.toUpperCase();
        if (val === 'B2B INTERNO') return 'b2b';
        if (val === 'LOJA' || val === 'ONLINE') return 'b2c';
    }

    // Fallback: CNPJ / B2B seller
    const client = pedido.cliente || {};
    const cpfCnpj = client.cpf_cnpj || client.cnpj || pedido.cpf_cnpj || '';
    const seller = pedido.nome_vendedor || pedido.vendedor || '';
    if ((cpfCnpj && isCNPJ(cpfCnpj)) || (seller && B2B_SELLERS.includes(seller))) {
        return 'b2b';
    }

    return 'b2c';
}

/**
 * fetchTinyOrdersOmnichannel
 * Fetches orders ONCE and segments them into All, B2B, B2C buckets + Vendedores.
 *
 * Segmentation (mutually exclusive, priority order):
 * - Intermediador field: B2B → B2B | B2C / VENDA ONLINE → B2C
 * - Marcadores: B2B INTERNO → B2B | LOJA / ONLINE → B2C
 * - Fallback: CNPJ or B2B seller → B2B, else B2C
 */
async function fetchTinyOrdersOmnichannel(
    startDate: string,
    endDate: string,
    limit: number = 50
) {
    // 1. Fetch BASIC list
    const tinyOrders = await getTinyOrders(startDate, endDate);

    // Take first N orders for detailed scanning
    const scanSize = Math.min(tinyOrders.length, limit);
    const ordersToScan = tinyOrders.slice(0, scanSize);

    console.log(`[Products] 📊 Scanning ${ordersToScan.length} of ${tinyOrders.length} orders`);

    const TINY_TOKEN = process.env.TINY_API_TOKEN;

    // Maps for each channel
    const mapAll = new Map<string, ProductSales>();
    const mapB2B = new Map<string, ProductSales>();
    const mapB2C = new Map<string, ProductSales>();

    // Seller tracking
    const mapSellers = new Map<string, SellerSales>();

    let revAll = 0, revB2B = 0, revB2C = 0;

    // Import segmentation helpers
    const { isCNPJ, B2B_SELLERS } = await import("./b2b-segmentation");

    // Debug counters
    let classifiedByIntermed = 0;
    let classifiedByMarcador = 0;
    let classifiedByFallback = 0;

    // Rate Limiting Config
    const chunkSize = 5;
    const delayMs = 4000;

    // Process in chunks
    for (let i = 0; i < ordersToScan.length; i += chunkSize) {
        const chunk = ordersToScan.slice(i, i + chunkSize);

        await Promise.all(chunk.map(async (order) => {
            try {
                // Fetch DETAILED order
                const url = `https://api.tiny.com.br/api2/pedido.obter.php?token=${TINY_TOKEN}&id=${order.id}&formato=json`;

                const res = await fetch(url, { next: { revalidate: 3600 } });
                const textData = await res.text();
                let data;

                try {
                    data = JSON.parse(textData);
                } catch {
                    if (textData.includes("API bloqueada") || textData.startsWith("API")) {
                        console.warn(`[Products] ⚠️ Tiny API Blocked/Limit for order ${order.id}. Skipping...`);
                        return;
                    }
                    return;
                }

                if (data.retorno?.status === 'Erro') return;

                const pedido = data.retorno?.pedido;
                if (!pedido) return;

                // --- DEBUG: Log intermediador & marcadores for first few orders ---
                if (i === 0) {
                    const intermedVal = getIntermediadorValue(pedido);
                    const marcadores = getMarcadores(pedido);
                    console.log(`[Products] 🏷️ Order ${order.id}: intermediador="${intermedVal}", marcadores=[${marcadores.join(', ')}]`);
                }

                // --- CLASSIFICATION ---
                const intermedVal = getIntermediadorValue(pedido);
                const marcadores = getMarcadores(pedido);
                const channel = classifyOrder(pedido, isCNPJ, B2B_SELLERS);

                // Track classification source for debugging
                if (intermedVal) {
                    const v = intermedVal.toUpperCase();
                    if (v === 'B2B' || v === 'B2C' || v === 'VENDA ONLINE') classifiedByIntermed++;
                } else {
                    const hasTag = marcadores.some(t => ['B2B INTERNO', 'LOJA', 'ONLINE'].includes(t.toUpperCase()));
                    if (hasTag) classifiedByMarcador++;
                    else classifiedByFallback++;
                }

                // --- SELLER TRACKING ---
                const sellerName = pedido.nome_vendedor || pedido.vendedor || '';

                // Process Items
                const orderItems = pedido.itens || [];

                orderItems.forEach((itemWrapper: any) => {
                    const item = itemWrapper.item;
                    const rawName = item.descricao;
                    const qty = parseFloat(item.quantidade);
                    const price = parseFloat(item.valor_unitario);
                    const revenue = qty * price;

                    const { name: normalizedName, multiplier } = normalizeProduct(rawName);
                    const realQty = qty * multiplier;
                    const key = normalizedName;

                    // 1. ALL — always
                    if (!mapAll.has(key)) {
                        mapAll.set(key, { productId: item.codigo, productName: normalizedName, quantity: 0, revenue: 0, percentage: 0 });
                    }
                    const pAll = mapAll.get(key)!;
                    pAll.quantity += realQty;
                    pAll.revenue += revenue;
                    revAll += revenue;

                    // 2. Channel-specific (B2B or B2C)
                    if (channel === 'b2b') {
                        if (!mapB2B.has(key)) mapB2B.set(key, { productId: item.codigo, productName: normalizedName, quantity: 0, revenue: 0, percentage: 0 });
                        const pB2B = mapB2B.get(key)!;
                        pB2B.quantity += realQty;
                        pB2B.revenue += revenue;
                        revB2B += revenue;
                    } else {
                        if (!mapB2C.has(key)) mapB2C.set(key, { productId: item.codigo, productName: normalizedName, quantity: 0, revenue: 0, percentage: 0 });
                        const pB2C = mapB2C.get(key)!;
                        pB2C.quantity += realQty;
                        pB2C.revenue += revenue;
                        revB2C += revenue;
                    }

                    // 3. Seller tracking (if seller is known)
                    if (sellerName) {
                        if (!mapSellers.has(sellerName)) {
                            mapSellers.set(sellerName, { sellerName, revenue: 0, quantity: 0 });
                        }
                        const s = mapSellers.get(sellerName)!;
                        s.revenue += revenue;
                        s.quantity += realQty;
                    }
                });

            } catch (err) {
                console.error(`[Products] Error processing order ${order.id}`, err);
            }
        }));

        // Rate limit delay
        if (i + chunkSize < ordersToScan.length) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    console.log(`[Products] 📊 Classification: ${classifiedByIntermed} by intermediador, ${classifiedByMarcador} by marcador, ${classifiedByFallback} by fallback (CNPJ/seller)`);
    console.log(`[Products] 👥 Sellers found: ${mapSellers.size} (${Array.from(mapSellers.keys()).join(', ')})`);

    return {
        mapAll, revAll,
        mapB2B, revB2B,
        mapB2C, revB2C,
        mapSellers,
    };
}

/**
 * Public function to get all datasets at once: All, B2B, B2C + Vendedores
 */
export async function getOmnichannelProducts(
    startDate: string,
    endDate: string,
    limit: number = 20
) {
    console.log(`[Products] 🛡️ Using Tiny API (Omnichannel Scan)...`);

    try {
        const scanLimit = 50;
        const { mapAll, revAll, mapB2B, revB2B, mapB2C, revB2C, mapSellers } =
            await fetchTinyOrdersOmnichannel(startDate, endDate, scanLimit);

        // Transform Product Maps to Sorted Arrays
        const processMap = (map: Map<string, ProductSales>, totalRev: number) => {
            return Array.from(map.values())
                .sort((a, b) => b.revenue - a.revenue)
                .map(p => ({
                    ...p,
                    percentage: totalRev > 0 ? (p.revenue / totalRev) * 100 : 0
                }))
                .slice(0, limit);
        };

        // Transform Sellers Map to Sorted Array
        const vendedores = Array.from(mapSellers.values())
            .sort((a, b) => b.revenue - a.revenue);

        return {
            all: processMap(mapAll, revAll),
            b2b: processMap(mapB2B, revB2B),
            b2c: processMap(mapB2C, revB2C),
            vendedores,
        };

    } catch (e) {
        console.error("[Products] ❌ Tiny Omnichannel failed:", e);
        return { all: [], b2b: [], b2c: [], vendedores: [] };
    }
}
