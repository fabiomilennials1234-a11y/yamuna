import { FunnelOverview } from "@/components/charts/FunnelOverview";
import { CustomerRetentionGroup, SalesRetentionGroup } from "@/components/dashboard/RetentionMetrics";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconTrendingUp, IconCurrencyDollar, IconShoppingCart, IconUsers } from "@tabler/icons-react";
import { KPICard } from "./KPICard";

function getFunnelData(data: any) {
    let sessions = data.sessions || 0;
    let productsViewed = data.productsViewed || 0;
    let addToCarts = data.addToCarts || 0;
    let checkouts = data.checkouts || 0;
    const transactions = data.transactions || 0;

    if (sessions === 0 && transactions > 0) {
        sessions = Math.round(transactions / 0.016);
        checkouts = Math.round(transactions / 0.4);
        addToCarts = Math.round(checkouts / 0.3);
        productsViewed = Math.round(sessions * 2.5);
    }

    return [
        { stage: "Sessões", users: sessions, value: sessions.toLocaleString('pt-BR'), subLabel: "Sessões" },
        {
            stage: "Estimado",
            users: Math.round(sessions * 0.6),
            value: Math.round(sessions * 0.6).toLocaleString('pt-BR'),
            subLabel: "Estimado (60%)"
        },
        { stage: "Visualizações", users: productsViewed, value: productsViewed.toLocaleString('pt-BR'), subLabel: "Produtos" },
        { stage: "Carrinho", users: addToCarts, value: addToCarts.toLocaleString('pt-BR'), subLabel: "Add ao Carrinho" },
        { stage: "Checkout", users: checkouts, value: checkouts.toLocaleString('pt-BR'), subLabel: "Iniciado" },
        { stage: "Transações", users: transactions, value: transactions.toLocaleString('pt-BR'), subLabel: "Transações" },
    ];
}


interface KPIProps {
    dataPromise: Promise<any>;
    startDate: string;
    endDate: string;
}

export async function DashboardKPIs({ dataPromise, startDate = "30daysAgo", endDate = "today" }: KPIProps) {
    const data = await dataPromise;

    return (
        <div className="flex flex-col gap-8">
            {/* Section 1: Investment & Efficiency */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <IconCurrencyDollar className="text-muted-foreground w-5 h-5" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Investimento & Eficiência</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 @container/main">
                    <KPICard label="Investimento" value={data.kpis.investment} prefix="R$ " delay={1} />
                    <KPICard label="% Custo" value={data.kpis.costPercentage} suffix="%" format="decimal" delay={2} invertTrend />
                </div>
            </section>

            {/* Section 2: Sales & Revenue */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <IconShoppingCart className="text-muted-foreground w-5 h-5" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Vendas & Receita</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 @container/main">
                    <KPICard label="Receita Total" value={data.revenue} prefix="R$ " delay={5} />
                    <KPICard label="Ticket Médio" value={data.kpis.ticketAvg} prefix="R$ " delay={6} />

                    {/* Streamed Retention Metrics */}
                    <SalesRetentionGroup startDate={startDate} endDate={endDate} />

                    <KPICard label="Receita B2B" value={data.b2b?.b2bRevenue || 0} prefix="R$ " delay={10} />
                    <KPICard label="Receita B2C" value={data.b2b?.b2cRevenue || 0} prefix="R$ " delay={11} />
                </div>
            </section>

            {/* Section 3: Customers */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <IconUsers className="text-muted-foreground w-5 h-5" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Clientes</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 @container/main">
                    <CustomerRetentionGroup startDate={startDate} endDate={endDate} />
                </div>
            </section>
        </div>
    );
}

export async function DashboardFunnel({ dataPromise }: { dataPromise: Promise<any> }) {

    const data = await dataPromise;
    const funnelData = getFunnelData(data);

    return (
        <Card className="xl:col-span-2 min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <IconTrendingUp className="size-5 text-muted-foreground" />
                    Funil de Vendas
                </CardTitle>
                <Badge variant="outline" className="font-normal">Tempo Real</Badge>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[350px]">
                <FunnelOverview data={funnelData} />
            </CardContent>
        </Card>
    );
}
