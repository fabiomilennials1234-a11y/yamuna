import { Skeleton } from "@/components/ui/Skeleton";
import { Header } from "@/components/layout/Header";

export default function Loading() {
    return (
        <>
            <Header title="Meta Ads - Criativos" />
            <main className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
                {/* Filter Bar Skeleton */}
                <div className="flex gap-4 mb-8">
                    <Skeleton className="h-10 w-48 rounded" />
                    <Skeleton className="h-10 w-32 rounded ml-auto" />
                </div>

                {/* Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="h-64 w-full rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-3/4 rounded" />
                                <Skeleton className="h-4 w-1/2 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </>
    );
}
