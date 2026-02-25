import { google } from "googleapis";
import { format, startOfISOWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getTinyOrders } from "./tiny";
import { normalizeProduct } from "./product-utils";

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

export interface ProductSales {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
    percentage: number;
}

export async function getTopProductsByPeriod(
    startDate: string,
    endDate: string,
    limit: number = 20, // Increased default limit
    channel: 'all' | 'b2b' | 'b2c' = 'all'
): Promise<ProductSales[]> {
    const shouldUseGA4 = channel === 'all'; // GA4 cannot segment by B2B/B2C (no customer data)

    // 1. Try GA4 First (Only if channel is 'all')
    if (shouldUseGA4 && CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN && GA4_PROPERTY_ID) {
        try {
            console.log(`[Products] 🔄 Fetching top products from GA4 (Channel: All)...`);

            const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
            auth.setCredentials({ refresh_token: REFRESH_TOKEN });
            const analyticsData = google.analyticsdata({ version: "v1beta", auth });

            // Fetch roughly 3x the limit to allow for normalization collapsing rows
            const fetchLimit = limit * 3;

            const response = await analyticsData.properties.runReport({
                property: `properties/${GA4_PROPERTY_ID}`,
                requestBody: {
                    dateRanges: [{ startDate, endDate }],
                    dimensions: [{ name: "itemName" }, { name: "itemId" }],
                    metrics: [{ name: "itemRevenue" }, { name: "itemsPurchased" }],
                    orderBys: [{ metric: { metricName: "itemRevenue" }, desc: true }],
                    limit: fetchLimit
                },
            } as any);

            const rows = response.data.rows || [];

            // Map and Normalize immediately
            const productMap = new Map<string, ProductSales>();
            let totalRevenue = 0;

            for (const row of rows) {
                const rawName = row.dimensionValues?.[0]?.value || "Unknown Product";
                const originalId = row.dimensionValues?.[1]?.value || "unknown";
                const revenue = parseFloat(row.metricValues?.[0]?.value || "0");
                const quantity = parseInt(row.metricValues?.[1]?.value || "0");

                if (revenue <= 0) continue;

                // Normalize: Group "Box 16 Ghee" into "Ghee"
                const { name: normalizedName, multiplier } = normalizeProduct(rawName);

                // Use normalized name as key to grouping
                const key = normalizedName;

                if (!productMap.has(key)) {
                    productMap.set(key, {
                        productId: originalId, // Keep one ID as reference
                        productName: normalizedName,
                        quantity: 0,
                        revenue: 0,
                        percentage: 0
                    });
                }

                const p = productMap.get(key)!;
                // Add adjusted quantity 
                // GA4 "itemsPurchased" usually counts individual SKUs sold.
                // If I configured GA4 efficiently, "Box 16" is one item.
                // So we multiply by pack size.
                p.quantity += quantity * multiplier;
                p.revenue += revenue;
                totalRevenue += revenue;
            }

            const products = Array.from(productMap.values())
                .sort((a, b) => b.revenue - a.revenue)
                .map(p => ({
                    ...p,
                    percentage: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0
                }));

            console.log(`[Products] ✅ GA4 Success: ${products.length} grouped products`);
            return products.slice(0, limit);

        } catch (error: any) {
            console.warn(`[Products] ⚠️ GA4 Skipped (Invalid Creds/Grant):`, error.message);
            console.log(`[Products] 🛡️ Falling back to Tiny ERP...`);
        }
    }


    // 2. FALLBACK / SEGMENTED: Fetch from Tiny
    console.log(`[Products] 🛡️ Using Tiny API (Channel: ${channel})`);

    try {
        // Fix: Scan much more orders than the display limit to find rare B2B/B2C orders
        // BUT: We must respect API limits (approx 60 req/min). 
        // OPTIMIZATION: Default to 40 distinct orders for quick list population unless more requested
        const scanLimit = 40;
        const { productMap, totalRevenue } = await fetchTinyOrdersForChannel(startDate, endDate, channel, scanLimit);

        const products = Array.from(productMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .map(p => ({
                ...p,
                percentage: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0
            }));

        console.log(`[Products] ✅ Tiny Success: ${products.length} grouped products`);
        return products.slice(0, limit);

    } catch (e) {
        console.error("[Products] ❌ Tiny fallback failed:", e);
        return [];
    }
}

/**
 * Fetch detailed history for a specific product from Tiny (filtered by channel)
 */
export async function getTinyProductHistory(
    productName: string,
    initialStartDate: string,
    endDate: string,
    channel: 'all' | 'b2b' | 'b2c',
    granularity: 'month' | 'week' = 'month'
): Promise<any[]> {
    console.log(`[Products] 🛡️ Fetching history for "${productName}" from Tiny (Channel: ${channel})...`);

    // Fetch orders - using slightly larger limit for history to capture trends
    // Optimized: Limit to 150 orders to keep response time < 30s
    const { rawItems } = await fetchTinyOrdersForChannel(initialStartDate, endDate, channel, 150, true);

    const targetName = normalizeProduct(productName).name.toLowerCase();

    // Filter items matching the product
    const relevantItems = rawItems.filter(item => {
        const normalized = normalizeProduct(item.name).name.toLowerCase();
        return normalized.includes(targetName) || targetName.includes(normalized);
    });

    // Group by period
    const historyMap = new Map<string, { date: string, sortKey: string, sales: number, revenue: number }>();

    relevantItems.forEach(item => {
        const dateParts = item.date.split('/'); // dd/mm/yyyy
        if (dateParts.length !== 3) return;

        const dateObj = new Date(
            parseInt(dateParts[2]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[0])
        );

        let key = "";
        let sortKey = "";

        if (granularity === 'month') {
            // YYYY-MM
            key = `${dateParts[2]}-${dateParts[1]}`;
            sortKey = key;
        } else {
            // Week logic: Group by Start of Week
            const startOfWeek = startOfISOWeek(dateObj);
            // Format: "12/Mar"
            key = format(startOfWeek, "dd/MMM", { locale: ptBR });
            // Sort by Date (YYYYMMDD)
            sortKey = format(startOfWeek, "yyyyMMdd");
        }

        if (!historyMap.has(key)) {
            historyMap.set(key, { date: key, sortKey, sales: 0, revenue: 0 });
        }

        const entry = historyMap.get(key)!;
        entry.sales += item.quantity;
        entry.revenue += item.revenue;
    });

    const result = Array.from(historyMap.values())
        .map(h => ({
            period: h.date,
            dateStr: h.date,
            sortKey: h.sortKey,
            sales: h.sales,
            revenue: h.revenue,
            isForecast: false
        }))
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return result;
}


/**
 * Core Logic to fetch and parse Tiny orders for a channel
 */

async function fetchTinyOrdersForChannel(
    startDate: string,
    endDate: string,
    channel: 'all' | 'b2b' | 'b2c',
    limit: number = 100, // Reduced default scan limit for speed
    returnRawItems: boolean = false
) {
    // 1. Fetch BASIC list (No CNPJ here usually)
    const tinyOrders = await getTinyOrders(startDate, endDate);

    // 2. We CANNOT filter efficiently here because we lack CNPJ.
    // We must filter AFTER fetching details.

    // Scan the most recent 'limit' orders to find relevant ones
    // We might need to scan MORE than 'limit' to find enough B2B orders, 
    // but for performance default to scanning the top X recent orders.
    const ordersToScan = tinyOrders.slice(0, limit);

    const TINY_TOKEN = process.env.TINY_API_TOKEN;
    const productMap = new Map<string, ProductSales>();
    const rawItems: any[] = [];
    let totalRevenue = 0;

    // Import segmentation logic
    const { isCNPJ, B2B_SELLERS } = await import("./b2b-segmentation");

    // NEW: Robust Rate Limiting Strategy
    // Tiny Limit: ~60 req/min (1 req/sec). We target 40 req/min for safety.
    // Batch Size: 5
    // Delay: Reduzido para 800ms para agilidade. (5 items / 800ms ~ 6 items/sec burst)
    // Risk: Tiny might block if sustained, but for 100 items (20 batches) it takes usually 16s.
    // Retain error handling to skip blocked.
    const chunkSize = 5;
    const delayMs = 800;

    // Process in chunks
    for (let i = 0; i < ordersToScan.length; i += chunkSize) {
        const chunk = ordersToScan.slice(i, i + chunkSize);

        // Process chunk concurrently
        await Promise.all(chunk.map(async (order) => {
            try {
                // Fetch DETAILED order (Contains CNPJ)
                const url = `https://api.tiny.com.br/api2/pedido.obter.php?token=${TINY_TOKEN}&id=${order.id}&formato=json`;
                // Remove jitter, we rely on batch delay

                const res = await fetch(url, { next: { revalidate: 3600 } });

                // Read text first to handle "API blocked" or HTML errors safely
                const textData = await res.text();
                let data;

                try {
                    data = JSON.parse(textData);
                } catch (parseError) {
                    // Start of generic API blocking message detection
                    if (textData.includes("API bloqueada") || textData.startsWith("API")) {
                        console.warn(`[Products] ⚠️ Tiny API Blocked/Limit for order ${order.id}. Skipping...`);
                        return; // Skip this order
                    }
                    return;
                }

                // Validate response
                if (data.retorno?.status === 'Erro') return;

                const pedido = data.retorno?.pedido;
                if (!pedido) return;

                // --- SEGMENTATION LOGIC (Now with Data!) ---
                if (channel !== 'all') {
                    const client = pedido.cliente || {};
                    const cpfCnpj = client.cpf_cnpj || client.cnpj || pedido.cpf_cnpj || '';
                    const seller = pedido.nome_vendedor || pedido.vendedor || '';

                    const isB2B = (cpfCnpj && isCNPJ(cpfCnpj)) || (seller && B2B_SELLERS.includes(seller));

                    if (channel === 'b2b' && !isB2B) return; // Skip B2C
                    if (channel === 'b2c' && isB2B) return; // Skip B2B
                }

                // If we get here, the order matches the channel
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

                    if (returnRawItems) {
                        rawItems.push({
                            name: rawName,
                            normalizedName,
                            quantity: realQty,
                            revenue,
                            date: pedido.data_pedido // Use detailed date
                        });
                    }

                    if (!productMap.has(key)) {
                        productMap.set(key, {
                            productId: item.codigo,
                            productName: normalizedName,
                            quantity: 0,
                            revenue: 0,
                            percentage: 0
                        });
                    }

                    const p = productMap.get(key)!;
                    p.quantity += realQty;
                    p.revenue += revenue;
                    totalRevenue += revenue;
                });
            } catch (err) {
                console.error(`[Products] Error processing order ${order.id}`, err);
            }
        }));

        // Wait before next batch (but skip if it's the last batch)
        if (i + chunkSize < ordersToScan.length) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    return { productMap, totalRevenue, rawItems };
}
