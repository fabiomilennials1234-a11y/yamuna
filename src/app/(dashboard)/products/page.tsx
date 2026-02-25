import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { fetchOmniProductsData } from "@/app/products-actions";
import { ProductsTable } from "@/components/dashboard/products-table";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
    searchParams: Promise<{
        start?: string;
        end?: string;
        channel?: string;
        limit?: string;
    }>;
}

export default async function ProductsPage(props: Props) {
    const searchParams = await props.searchParams;

    const startDate = searchParams.start || "30daysAgo";
    const endDate = searchParams.end || "today";

    // Parse Limit (Default: 20, Max: 1000)
    const limitParam = parseInt(searchParams.limit || "20");
    const limit = isNaN(limitParam) ? 20 : Math.min(limitParam, 1000);

    console.log(`[ProductsPage] 🔍 Search Params:`, { startDate, endDate, limit, channel: searchParams.channel });

    // Fetch Omnichannel products (All, B2B, B2C at once)
    const productsData = await fetchOmniProductsData(startDate, endDate, limit);

    console.log(`[ProductsPage] 📦 Fetched Data:`, {
        all: productsData.all?.length || 0,
        b2b: productsData.b2b?.length || 0,
        b2c: productsData.b2c?.length || 0
    });

    return (
        <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
            <div className="flex items-center justify-between py-6">
                <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
                    Curva ABC de Produtos
                </h2>
                <div className="flex items-center space-x-2">
                    <DateRangeFilter />
                </div>
            </div>

            <main className="w-full">
                <ProductsTable
                    initialData={productsData}
                    currentLimit={searchParams.limit || "20"}
                />

                <div className="mt-4 p-4 bg-[#050510]/50 border rounded-lg border-white/5 text-xs text-slate-400 flex flex-wrap gap-4">
                    <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span> <strong>Classe A:</strong> Até 80% da receita</p>
                    <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></span> <strong>Classe B:</strong> 80% a 95% da receita</p>
                    <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-600"></span> <strong>Classe C:</strong> Acima de 95%</p>
                </div>
            </main>
        </div>
    );
}
