
import { getTinyOrders } from "./tiny";
import { normalizeProduct } from "./product-utils";
import { ProductSales } from "./tiny-products";

/**
 * fetchTinyOrdersOmnichannel
 * Fetches orders ONCE and segments them into All, B2B, and B2C buckets in memory.
 * Eliminates redundant API calls when switching tabs.
 */
async function fetchTinyOrdersOmnichannel(
    startDate: string,
    endDate: string,
    limit: number = 50 // Decreased to ensure speed
) {
    // 1. Fetch BASIC list
    const tinyOrders = await getTinyOrders(startDate, endDate);
    const ordersToScan = tinyOrders.slice(0, limit);

    const TINY_TOKEN = process.env.TINY_API_TOKEN;

    // Maps for each channel
    const mapAll = new Map<string, ProductSales>();
    const mapB2B = new Map<string, ProductSales>();
    const mapB2C = new Map<string, ProductSales>();

    let revAll = 0, revB2B = 0, revB2C = 0;

    // Import segmentation logic
    const { isCNPJ, B2B_SELLERS } = await import("./b2b-segmentation");

    // Rate Limiting Config
    // Tiny Limit: ~60 req/min. We target 40-50 req/min for safety but slightly faster.
    const chunkSize = 5;
    const delayMs = 4000; // 5 req / 4s = 1.25 req/s (approx 75/min max burst, safe avg)

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

                if (data.retorno?.status === 'Erro') return; // Business error

                const pedido = data.retorno?.pedido;
                if (!pedido) return;

                // --- SEGMENTATION LOGIC ---
                const client = pedido.cliente || {};
                const cpfCnpj = client.cpf_cnpj || client.cnpj || pedido.cpf_cnpj || '';
                const seller = pedido.nome_vendedor || pedido.vendedor || '';

                const isB2B = (cpfCnpj && isCNPJ(cpfCnpj)) || (seller && B2B_SELLERS.includes(seller));

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

                    // Helper to add to map
                    const addToMap = (map: Map<string, ProductSales>, totalRevRef: { val: number }) => {
                        if (!map.has(key)) {
                            map.set(key, {
                                productId: item.codigo,
                                productName: normalizedName,
                                quantity: 0,
                                revenue: 0,
                                percentage: 0
                            });
                        }
                        const p = map.get(key)!;
                        p.quantity += realQty;
                        p.revenue += revenue;
                        totalRevRef.val += revenue;
                    };

                    // Always add to ALL
                    // NOTE: Javascript primitives are passed by value, so we can't pass 'revAll' direct to be mutated.
                    // We update variables manually below.

                    // 1. ALL
                    if (!mapAll.has(key)) {
                        mapAll.set(key, { productId: item.codigo, productName: normalizedName, quantity: 0, revenue: 0, percentage: 0 });
                    }
                    const pAll = mapAll.get(key)!;
                    pAll.quantity += realQty;
                    pAll.revenue += revenue;
                    revAll += revenue;

                    // 2. B2B or B2C
                    if (isB2B) {
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

    return {
        mapAll, revAll,
        mapB2B, revB2B,
        mapB2C, revB2C
    };
}

/**
 * Public function to get all 3 datasets at once
 */
export async function getOmnichannelProducts(
    startDate: string,
    endDate: string,
    limit: number = 20
) {
    console.log(`[Products] 🛡️ Using Tiny API (Omnichannel Scan)...`);

    try {
        const scanLimit = 50; // Optimized for speed (approx 40s)
        const { mapAll, revAll, mapB2B, revB2B, mapB2C, revB2C } = await fetchTinyOrdersOmnichannel(startDate, endDate, scanLimit);

        // Transform Maps to Sorted Arrays
        const processMap = (map: Map<string, ProductSales>, totalRev: number) => {
            return Array.from(map.values())
                .sort((a, b) => b.revenue - a.revenue)
                .map(p => ({
                    ...p,
                    percentage: totalRev > 0 ? (p.revenue / totalRev) * 100 : 0
                }))
                .slice(0, limit);
        };

        return {
            all: processMap(mapAll, revAll),
            b2b: processMap(mapB2B, revB2B),
            b2c: processMap(mapB2C, revB2C),
        };

    } catch (e) {
        console.error("[Products] ❌ Tiny Omnichannel failed:", e);
        return { all: [], b2b: [], b2c: [] };
    }
}
