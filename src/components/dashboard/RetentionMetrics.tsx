import { Suspense } from 'react';
import {
    Card,
    CardHeader,
} from "@/components/ui/card";
import { fetchRetentionMetrics } from "@/app/actions";
import { AutoRefresh } from "@/components/dashboard/AutoRefresh";
import { KPICard } from "./KPICard";

// Skeleton for loading state
function MetricSkeleton({ delay = 0 }) {
    return (
        <Card className="flex flex-col justify-between h-[120px]">
            <CardHeader>
                <div className="h-3 w-32 bg-muted/50 rounded animate-pulse" />
                <div className="mt-2 h-8 w-24 bg-muted/50 rounded animate-pulse" />
            </CardHeader>
        </Card>
    );
}

async function SalesRetentionData({ startDate, endDate }: { startDate: string, endDate: string }) {
    try {
        const data = await fetchRetentionMetrics(startDate, endDate);
        const shouldRefresh = data.newRevenue === 0 && data.retentionRevenue === 0;

        return (
            <>
                {shouldRefresh && <AutoRefresh interval={5000} />}
                <KPICard label="Ticket Médio Novos" value={data.ticketAvgNew} prefix="R$ " delay={7} />
                <KPICard label="Retenção" value={data.retentionRevenue} prefix="R$ " delay={8} />
                <KPICard label="Receita Nova" value={data.newRevenue} prefix="R$ " delay={9} />
            </>
        );
    } catch (error) {
        console.error("[SalesRetentionData] Failed to fetch data:", error);
        return (
            <>
                <AutoRefresh interval={5000} />
                <KPICard label="Ticket Médio Novos" value={0} prefix="R$ " delay={7} />
                <KPICard label="Retenção" value={0} prefix="R$ " delay={8} />
                <KPICard label="Receita Nova" value={0} prefix="R$ " delay={9} />
            </>
        );
    }
}

async function CustomersRetentionData({ startDate, endDate }: { startDate: string, endDate: string }) {
    try {
        const data = await fetchRetentionMetrics(startDate, endDate);

        return (
            <>
                <KPICard label="Clientes Adquiridos" value={data.acquiredCustomers} format="number" delay={9} />
                <KPICard label="Custo de Aquisição (CAC)" value={data.cac} prefix="R$ " delay={10} invertTrend />
            </>
        );
    } catch (error) {
        console.error("[CustomersRetentionData] Failed to fetch data:", error);
        return (
            <>
                <KPICard label="Clientes Adquiridos" value={0} format="number" delay={9} />
                <KPICard label="Custo de Aquisição (CAC)" value={0} prefix="R$ " delay={10} invertTrend />
            </>
        );
    }
}

export function SalesRetentionGroup({ startDate, endDate }: { startDate: string, endDate: string }) {
    return (
        <Suspense fallback={
            <>
                <MetricSkeleton delay={7} />
                <MetricSkeleton delay={8} />
                <MetricSkeleton delay={9} />
            </>
        }>
            <SalesRetentionData startDate={startDate} endDate={endDate} />
        </Suspense>
    );
}

export function CustomerRetentionGroup({ startDate, endDate }: { startDate: string, endDate: string }) {
    return (
        <Suspense fallback={
            <>
                <MetricSkeleton delay={9} />
                <MetricSkeleton delay={10} />
            </>
        }>
            <CustomersRetentionData startDate={startDate} endDate={endDate} />
        </Suspense>
    );
}
