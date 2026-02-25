import { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

// Component to load last month data asynchronously
async function LastMonthData() {
    const { fetchLastMonthData } = await import("@/app/actions");
    const lastMonthData = await fetchLastMonthData();

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Mês Anterior ({lastMonthData.label})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg border">
                    <span className="text-sm text-muted-foreground block mb-1">Receita Faturada</span>
                    <div className="text-2xl font-bold text-emerald-500">
                        R$ <AnimatedNumber value={lastMonthData.revenue || 0} format="decimal" />
                    </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border">
                    <span className="text-sm text-muted-foreground block mb-1">Investimento Ads</span>
                    <div className="text-2xl font-bold">
                        R$ <AnimatedNumber value={lastMonthData.investment || 0} format="decimal" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Loading skeleton
function LastMonthDataSkeleton() {
    return (
        <Card className="h-full">
            <CardHeader>
                <div className="h-6 w-48 bg-muted/50 rounded animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg border">
                    <div className="h-3 w-24 bg-muted/50 rounded animate-pulse mb-2" />
                    <div className="h-8 w-32 bg-muted/50 rounded animate-pulse" />
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border">
                    <div className="h-3 w-24 bg-muted/50 rounded animate-pulse mb-2" />
                    <div className="h-8 w-32 bg-muted/50 rounded animate-pulse" />
                </div>
            </CardContent>
        </Card>
    );
}

// Main component with Suspense boundary
export function LastMonthSection() {
    return (
        <Suspense fallback={<LastMonthDataSkeleton />}>
            <LastMonthData />
        </Suspense>
    );
}
