
const TINY_TOKEN = process.env.TINY_API_TOKEN;

interface StockInfo {
    sku: string;
    stock: number;
    name: string;
}

export async function getProductStock(sku: string): Promise<StockInfo | null> {
    if (!TINY_TOKEN) return null;

    try {
        console.log(`[StockService] Checking stock for SKU: ${sku}`);
        const url = `https://api.tiny.com.br/api2/produto.obter.estoque.php?token=${TINY_TOKEN}&id=${sku}&formato=json`;

        const res = await fetch(url, { next: { revalidate: 60 } }); // Cache for 1 min
        const data = await res.json();

        if (data.retorno?.status === "Erro") {
            // Try searching by code if ID failed (sometimes SKU is passed as ID)
            // Or just return null
            console.warn(`[StockService] SKU lookup failed for ${sku}: ${data.retorno.erros?.[0]?.erro}`);
            return getStockBySearch(sku);
        }

        return {
            sku: sku,
            stock: parseFloat(data.retorno?.produto?.saldo || "0"),
            name: "Internal Lookup"
        };
    } catch (e) {
        console.error("[StockService] Error:", e);
        return null;
    }
}

// Fallback: simple search to find ID/Stock if direct ID failed
async function getStockBySearch(query: string): Promise<StockInfo | null> {
    if (!TINY_TOKEN) return null;
    try {
        console.log(`[StockService] Search fallback for: ${query}`);
        const url = `https://api.tiny.com.br/api2/produtos.pesquisa.php?token=${TINY_TOKEN}&pesquisa=${encodeURIComponent(query)}&formato=json`;
        const res = await fetch(url, { next: { revalidate: 60 } });
        const data = await res.json();

        if (data.retorno?.produtos && data.retorno.produtos.length > 0) {
            const bestMatch = data.retorno.produtos[0].produto;
            const id = bestMatch.id;

            // Now fetch the actual stock for this ID
            console.log(`[StockService] Found match: ${bestMatch.nome} (ID: ${id}). Fetching stock...`);
            const stockUrl = `https://api.tiny.com.br/api2/produto.obter.estoque.php?token=${TINY_TOKEN}&id=${id}&formato=json`;
            const stockRes = await fetch(stockUrl, { next: { revalidate: 60 } });
            const stockData = await stockRes.json();

            const stockQty = parseFloat(stockData.retorno?.produto?.saldo || "0");

            return {
                sku: bestMatch.codigo,
                stock: stockQty,
                name: bestMatch.nome
            };
        }
        return null;
    } catch (e) {
        console.error("[StockService] Search error:", e);
        return null;
    }
}

/**
 * Batch fetch stock for multiple SKUs with rate limiting.
 * Tiny doesn't support batch, so we fetch sequentially in chunks.
 * Returns Map<SKU, StockInfo>
 */
export async function getStockBatch(skus: string[]): Promise<Map<string, StockInfo>> {
    const results = new Map<string, StockInfo>();
    if (!TINY_TOKEN || skus.length === 0) return results;

    const chunkSize = 3;
    const delayMs = 2000;

    for (let i = 0; i < skus.length; i += chunkSize) {
        const chunk = skus.slice(i, i + chunkSize);

        const stockResults = await Promise.all(
            chunk.map(async (sku) => {
                const info = await getProductStock(sku);
                return { sku, info };
            })
        );

        stockResults.forEach(r => {
            if (r.info) results.set(r.sku, r.info);
        });

        if (i + chunkSize < skus.length) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    console.log(`[StockService] Batch: fetched ${results.size}/${skus.length} stock levels`);
    return results;
}
