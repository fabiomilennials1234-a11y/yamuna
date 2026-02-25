import { Suspense } from 'react';
import { KPICard } from './KPICard';
import { Rocket } from "lucide-react";
import {
    Card,
    CardHeader,
} from "@/components/ui/card";

// Component to load 6-month metrics asynchronously
async function SixMonthMetrics() {
    try {
        const { fetch6MonthMetrics } = await import("@/app/actions");
        const data6m = await fetch6MonthMetrics();

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                    label="Faturamento 6 Meses"
                    value={data6m.revenue}
                    format="decimal"
                    prefix="R$ "
                    delay={11}
                />
                <KPICard
                    label="LTV 6 Meses"
                    value={data6m.ltv}
                    format="decimal"
                    prefix="R$ "
                    delay={12}
                />
                <KPICard
                    label="ROI 6 Meses"
                    value={data6m.roi}
                    format="decimal"
                    suffix="x"
                    delay={13}
                />
            </div>
        );
    } catch (error) {
        console.error("[SixMonthMetrics] Failed to fetch data:", error);
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard label="Faturamento 6 Meses" value={0} prefix="R$ " />
                <KPICard label="LTV 6 Meses" value={0} prefix="R$ " />
                <KPICard label="ROI 6 Meses" value={0} suffix="x" />
            </div>
        );
    }
}

// Loading skeleton for 6-month metrics
function SixMonthMetricsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
                <Card key={i} className="flex flex-col justify-between h-[120px]">
                    <CardHeader>
                        <div className="h-3 w-32 bg-muted/50 rounded animate-pulse" />
                        <div className="mt-2 h-8 w-24 bg-muted/50 rounded animate-pulse" />
                    </CardHeader>
                </Card>
            ))}
        </div>
    );
}

// Main component with Suspense boundary
export function SixMonthMetricsSection() {
    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <Rocket className="text-muted-foreground w-5 h-5" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Crescimento (6 Meses)</h3>
            </div>
            <Suspense fallback={<SixMonthMetricsSkeleton />}>
                <SixMonthMetrics />
            </Suspense>
        </section>
    );
}
