import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { DollarSign, MousePointer2, ShoppingBag, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGA4GoogleAdsCampaigns } from "@/lib/services/ga4-reports";
import { format, subDays, parseISO } from "date-fns";

// Enable dynamic rendering
export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{ start?: string; end?: string }>;
}

export default async function GoogleAdsPage(props: Props) {
    const searchParams = await props.searchParams;
    const startDate = searchParams.start || "30daysAgo";
    const endDate = searchParams.end || "today";

    // Date parsing logic (same as main dashboard)
    let startIso = startDate;
    let endIso = endDate;

    if (startDate === "30daysAgo") {
        startIso = format(subDays(new Date(), 30), "yyyy-MM-dd");
    }
    if (endDate === "today") {
        endIso = format(new Date(), "yyyy-MM-dd");
    }

    // Fetch data
    const data = await getGA4GoogleAdsCampaigns(startIso, endIso);

    const totals = data?.totals || { sessions: 0, purchases: 0, revenue: 0 };
    const campaigns = data?.campaigns || [];

    // Calculate derived metrics
    const conversionRate = totals.sessions > 0 ? (totals.purchases / totals.sessions) * 100 : 0;
    const avgTicket = totals.purchases > 0 ? totals.revenue / totals.purchases : 0;

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between py-6">
                <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">Google Ads (via GA4)</h2>
                <div className="flex items-center space-x-2">
                    <DateRangeFilter />
                </div>
            </div>
            <main className="space-y-8 max-w-[1600px] mx-auto relative w-full">

                {/* Intro / Note */}
                <Card className="bg-muted/50">
                    <div className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full border border-primary/20">
                            <Users className="text-primary w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">
                                Mostrando dados de tráfego <strong>Pago do Google</strong> capturados pelo Google Analytics 4.
                            </p>
                            <p className="text-muted-foreground text-xs mt-0.5">
                                Métricas de custo (CPC, ROAS) requerem vínculo direto com o Google Ads e importação de custo no GA4.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Sessions */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Sessões (Cliques)</CardTitle>
                            <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totals.sessions.toLocaleString('pt-BR')}</div>
                            <p className="text-xs text-muted-foreground">Visitantes via Google CPC</p>
                        </CardContent>
                    </Card>

                    {/* Revenue */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Receita Gerada</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground">Faturamento atribuído</p>
                        </CardContent>
                    </Card>

                    {/* Purchases */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Conversões</CardTitle>
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totals.purchases}</div>
                            <p className="text-xs text-muted-foreground">
                                Taxa de Conv.: <span className="text-primary">{conversionRate.toFixed(2)}%</span>
                            </p>
                        </CardContent>
                    </Card>

                    {/* Avg Ticket */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ticket Médio Ads</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground">Por conversão</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Campaigns Table */}
                <Card className="overflow-hidden">

                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Performance por Campanha</CardTitle>
                        <span className="text-xs bg-muted px-2 py-1 rounded font-mono">Top Campanhas via GA4</span>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-[#050510]/80 text-slate-400 text-xs uppercase font-semibold backdrop-blur-sm">
                                    <tr>
                                        <th className="px-6 py-4">Campanha</th>
                                        <th className="px-6 py-4 text-right">Sessões</th>
                                        <th className="px-6 py-4 text-right">Conversões</th>
                                        <th className="px-6 py-4 text-right">Taxa Conv.</th>
                                        <th className="px-6 py-4 text-right">Receita</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-300">
                                    {campaigns.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <MousePointer2 className="w-8 h-8 text-slate-600 mb-2" />
                                                    Nenhum tráfego do Google Ads (medium=cpc) encontrado neste período.
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        campaigns.map((camp, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-white group-hover:text-indigo-400 transition-colors max-w-[300px] truncate" title={camp.name}>
                                                    {camp.name}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-400">
                                                    {camp.sessions.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-white">
                                                    {camp.purchases}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono">
                                                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs">
                                                        {camp.conversionRate.toFixed(2)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">
                                                    R$ {camp.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
