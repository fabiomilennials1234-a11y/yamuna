// Server Component

import { getMetaTopCreatives, getMetaAdsInsights } from "@/lib/services/meta";
import { MetaAdsClient } from "./MetaAdsClient";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, MousePointer2, TrendingUp, BarChart3 } from "lucide-react";

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{
        start?: string;
        end?: string;
    }>;
}

export default async function MetaAdsPage(props: Props) {
    const searchParams = await props.searchParams;
    const startDate = searchParams.start || "30daysAgo";
    const endDate = searchParams.end || "today";

    const formatDate = (str: string) => {
        const d = new Date();
        if (str === "today") return d.toISOString().split('T')[0];
        if (str === "30daysAgo") {
            d.setDate(d.getDate() - 30);
            return d.toISOString().split('T')[0];
        }
        return str;
    };

    const s = formatDate(startDate);
    const e = formatDate(endDate);

    // Fetch creatives + account-level insights in parallel
    const [creativesResult, insights] = await Promise.all([
        getMetaTopCreatives(s, e),
        getMetaAdsInsights(s, e),
    ]);

    const error = !Array.isArray(creativesResult) ? (creativesResult as any).error : null;
    const creatives = Array.isArray(creativesResult) ? creativesResult : [];

    const totalSpend = insights?.spend ?? 0;
    const totalImpressions = insights?.impressions ?? 0;
    const totalClicks = insights?.clicks ?? 0;
    const cpc = insights?.cpc ?? 0;
    const ctr = insights?.ctr ?? 0;
    const roas = insights?.purchase_roas ?? 0;

    // Total revenue attributed by Meta (sum from creatives)
    const totalRevenue = creatives.reduce((sum: number, c: any) => sum + (c.revenue ?? 0), 0);
    const calculatedRoas = totalSpend > 0 && totalRevenue > 0 ? totalRevenue / totalSpend : 0;
    const displayRoas = roas > 0 ? roas : calculatedRoas;

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between py-6">
                <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">Meta Ads - Criativos</h2>
                <div className="flex items-center space-x-2">
                    <DateRangeFilter />
                </div>
            </div>

            <main className="space-y-6 overflow-y-auto w-full">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 text-red-500 font-bold mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Erro na Conexão com Meta Ads
                        </div>
                        <p className="text-red-400 text-sm font-mono">{error}</p>
                        <p className="text-red-400/70 text-xs mt-2">Verifique seu Token de Acesso em .env.local</p>
                    </div>
                )}

                {/* Investment Summary */}
                {!error && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Investimento Meta</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-400">
                                    R$ {totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Gasto total no período · fonte: Meta API</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">ROAS Meta</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {displayRoas > 0 ? `${displayRoas.toFixed(2)}x` : "—"}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Retorno sobre investimento</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Cliques</CardTitle>
                                <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalClicks.toLocaleString('pt-BR')}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    CPC: R$ {cpc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · CTR: {ctr.toFixed(2)}%
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Impressões</CardTitle>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalImpressions.toLocaleString('pt-BR')}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    CPM: R$ {(totalSpend > 0 && totalImpressions > 0 ? (totalSpend / totalImpressions * 1000) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <MetaAdsClient creatives={creatives} startDate={startDate} endDate={endDate} />
            </main>
        </div>
    );
}
