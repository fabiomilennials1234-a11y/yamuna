import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { fetchStockOverview, fetchStockHistory } from "@/app/stock-actions";
import { StockPageClient } from "@/components/dashboard/stock-page-client";

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{
        start?: string;
        end?: string;
    }>;
}

export default async function EstoquePage(props: Props) {
    const searchParams = await props.searchParams;

    const startDate = searchParams.start || "30daysAgo";
    const endDate = searchParams.end || "today";

    // Fetch stock overview + history in parallel
    const [data, history] = await Promise.all([
        fetchStockOverview(startDate, endDate, 30),
        fetchStockHistory(undefined, 6),
    ]);

    return (
        <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
            <div className="flex items-center justify-between py-6">
                <div>
                    <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
                        Estoque e Demanda
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Cobertura de estoque, demanda projetada e alertas por SKU
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <DateRangeFilter />
                </div>
            </div>

            <main className="w-full">
                <StockPageClient data={data} history={history} />

                <div className="mt-4 p-4 bg-[#050510]/50 border rounded-lg border-white/5 text-xs text-slate-400 flex flex-wrap gap-4">
                    <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        <strong>Critico:</strong> Menos de 15 dias de cobertura
                    </p>
                    <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                        <strong>Atencao:</strong> 15 a 45 dias de cobertura
                    </p>
                    <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        <strong>Saudavel:</strong> Mais de 45 dias de cobertura
                    </p>
                    <p className="text-slate-500 ml-auto">
                        * Media mensal e demanda baseadas no periodo selecionado
                    </p>
                </div>
            </main>
        </div>
    );
}
