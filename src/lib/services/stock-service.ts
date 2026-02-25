
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
 * Batch fetch stock for multiple IDs (Tiny doesn't support batch well, so use sparingly)
 * Returns Map<SKU, Quantity>
 */
export async function getStockBatch(skus: string[]): Promise<Map<string, number>> {
    // Basic implementation - Mocking or sequential
    // For specific requirement "Previsão de estoque" we might need this.
    // For now, we only fetch on demand in the modal.
    return new Map();
}
