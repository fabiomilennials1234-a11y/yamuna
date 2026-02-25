import { Skeleton } from "@/components/ui/Skeleton";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function Loading() {
    return (
        <>
            <Header title="Origem/Mídia (GA4)" />
            <main className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
                {/* Treemap Skeleton */}
                <Card className="h-[400px]">
                    <CardHeader>
                        <Skeleton className="h-6 w-48 rounded" />
                    </CardHeader>
                    <CardContent className="h-full">
                        <Skeleton className="h-full w-full rounded" />
                    </CardContent>
                </Card>

                {/* Table Skeleton */}
                <div className="space-y-4">
                    <Skeleton className="h-10 w-32 rounded ml-auto" />
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full rounded" />
                    ))}
                </div>
            </main>
        </>
    );
}
