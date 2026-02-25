import { Skeleton } from "@/components/ui/Skeleton";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function Loading() {
    return (
        <>
            <Header title="Google Ads (via GA4)" />
            <main className="p-4 lg:p-8 space-y-8 max-w-[1600px] mx-auto animate-pulse">
                {/* Intro Skeleton */}
                <Skeleton className="h-20 w-full rounded-lg" />

                {/* KPI Skeleton */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-[100px]" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-[60px]" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Table Skeleton */}
                <Card className="col-span-4">
                    <CardHeader>
                        <Skeleton className="h-6 w-48 rounded mb-6" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-12 w-full rounded" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </>
    );
}
