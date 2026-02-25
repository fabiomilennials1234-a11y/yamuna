import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { fetchFunnelData } from "@/app/funnel-actions";
import { GoalEditorWrapper } from "@/components/funnel/GoalEditorWrapper";
import { FunnelVisualization } from "@/components/funnel/FunnelVisualization";
import { MonthComparison } from "@/components/funnel/MonthComparison";
import { TopProducts } from "@/components/funnel/TopProducts";
import { ProjectionSection } from "@/components/funnel/ProjectionSection";
import { ShoppingCart, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Suspense } from "react";

// Force dynamic rendering to respect date filters
export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{ start?: string; end?: string }>;
}

export default async function FunnelPage(props: Props) {
    const searchParams = await props.searchParams;
    const startDate = searchParams.start || "30daysAgo";
    const endDate = searchParams.end || "today";

    return (
        <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
            {/* Renderiza IMEDIATAMENTE — não espera dados */}
            <div className="flex items-center justify-between py-6">
                <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
                    Funil Loja Virtual
                </h2>
                <div className="flex items-center space-x-2">
                    <DateRangeFilter />
                </div>
            </div>

            {/* Exibe skeleton enquanto dados carregam em background */}
            <Suspense fallback={<FunnelSkeleton />}>
                <FunnelContent startDate={startDate} endDate={endDate} />
            </Suspense>
        </div>
    );
}

async function FunnelContent({ startDate, endDate }: { startDate: string; endDate: string }) {
    const data = await fetchFunnelData(startDate, endDate);

    const hasGA4Data = data.selectedPeriod.sessions > 0;
    const hasTransactionData = data.selectedPeriod.transactions > 0;

    return (
        <main className="space-y-6 overflow-y-auto w-full">
            {!hasGA4Data && (
                <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="text-amber-400 flex-shrink-0" size={20} />
                    <div>
                        <h4 className="text-amber-400 font-semibold mb-1">Dados do GA4 Indisponíveis</h4>
                        <p className="text-slate-300 text-sm">
                            O funil está mostrando estimativas baseadas em {data.selectedPeriod.transactions} transações.
                            Para dados completos, verifique a integração do Google Analytics 4.
                        </p>
                    </div>
                </div>
            )}

            <GoalEditorWrapper
                initialGoal={data.currentMonth.goal ? {
                    month: `${data.currentMonth.year}-${String(data.currentMonth.month).padStart(2, '0')}`,
                    revenue: data.currentMonth.goal.revenue_goal,
                    transactions: data.currentMonth.goal.transactions_goal,
                    investment: data.currentMonth.goal.ad_budget_goal
                } : null}
            />

            <ProjectionSection
                goal={data.currentMonth.goal ? {
                    revenue: data.currentMonth.goal.revenue_goal || 0,
                    transactions: data.currentMonth.goal.transactions_goal || 0,
                    investment: data.currentMonth.goal.ad_budget_goal || 0
                } : null}
                currentData={{
                    revenue: data.currentMonth.revenue,
                    transactions: data.currentMonth.transactions,
                    avgTicket: data.currentMonth.avgTicket
                }}
            />

            <FunnelVisualization funnel={data.selectedPeriod} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 flex flex-col justify-center gap-2">
                    <p className="text-slate-400 text-sm">Ticket Médio</p>
                    <p className="text-white text-2xl font-bold">
                        R$ {data.selectedPeriod.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {hasTransactionData && (
                        <p className="text-slate-500 text-xs">
                            {data.selectedPeriod.transactions} transações
                        </p>
                    )}
                </Card>

                <Card className="p-6 flex flex-col justify-center gap-2">
                    <p className="text-slate-400 text-sm">Sessões Totais</p>
                    <p className="text-white text-2xl font-bold">
                        {data.selectedPeriod.sessions.toLocaleString('pt-BR')}
                    </p>
                    {!hasGA4Data && (
                        <p className="text-amber-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle size={12} /> Estimativa
                        </p>
                    )}
                </Card>

                <Card className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-full">
                        <ShoppingCart className="text-muted-foreground" size={24} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm mb-1">Eventos Carrinho</p>
                        <p className="text-white text-2xl font-bold">
                            {data.selectedPeriod.addToCarts.toLocaleString('pt-BR')}
                        </p>
                    </div>
                </Card>

                <Card className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-full">
                        <TrendingUp className="text-emerald-400" size={24} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm mb-1">Taxa de Conversão</p>
                        <p className="text-white text-2xl font-bold">
                            {data.selectedPeriod.conversionRate.toFixed(2)}%
                        </p>
                    </div>
                </Card>
            </div>

            <MonthComparison
                currentMonth={data.currentMonth}
                previousMonth={data.previousMonth}
            />

            <TopProducts products={data.selectedPeriod.products.map(p => ({
                name: p.product || 'Produto desconhecido',
                quantity: p.quantity,
                revenue: p.revenue
            }))} />

            {process.env.NODE_ENV === 'development' && (
                <Card>
                    <CardContent className="p-4">
                        <details className="text-xs">
                            <summary className="text-slate-400 cursor-pointer font-mono mb-2">🐛 Debug Info</summary>
                            <pre className="text-slate-500 overflow-auto">
                                {JSON.stringify({
                                    selectedPeriod: {
                                        sessions: data.selectedPeriod.sessions,
                                        transactions: data.selectedPeriod.transactions,
                                        revenue: data.selectedPeriod.revenue,
                                        addToCarts: data.selectedPeriod.addToCarts,
                                        checkouts: data.selectedPeriod.checkouts,
                                    },
                                    currentMonth: {
                                        revenue: data.currentMonth.revenue,
                                        transactions: data.currentMonth.transactions,
                                        investment: data.currentMonth.investment,
                                        goal: data.currentMonth.goal
                                    },
                                    hasGA4Data,
                                    hasTransactionData
                                }, null, 2)}
                            </pre>
                        </details>
                    </CardContent>
                </Card>
            )}
        </main>
    );
}

function FunnelSkeleton() {
    return (
        <main className="space-y-6 w-full">
            <div className="h-24 bg-muted/30 rounded-xl animate-pulse" />
            <div className="h-16 bg-muted/30 rounded-xl animate-pulse" />
            <div className="h-64 bg-muted/30 rounded-xl animate-pulse" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 bg-muted/30 rounded-xl animate-pulse" />
                ))}
            </div>
            <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
        </main>
    );
}
