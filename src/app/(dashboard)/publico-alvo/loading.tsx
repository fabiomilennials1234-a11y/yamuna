import { Skeleton } from "@/components/ui/Skeleton";
import { Header } from "@/components/layout/Header";

export default function Loading() {
    return (
        <>
            <Header title="Público-alvo (GA4)" />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex items-center justify-between space-y-2">
                    <Skeleton className="h-8 w-[150px]" />
                </div>
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Skeleton className="col-span-4 h-[400px] rounded-xl" />
                        <Skeleton className="col-span-3 h-[400px] rounded-xl" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                        <Skeleton className="h-[300px] rounded-xl" />
                        <Skeleton className="h-[300px] rounded-xl" />
                    </div>
                </div>
            </div>
        </>
    );
}
