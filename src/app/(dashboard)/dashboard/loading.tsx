import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Loading() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between space-y-2">
                <Skeleton className="h-8 w-[150px]" />
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-8 w-[250px]" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-[120px] rounded-xl" />
                    <Skeleton className="h-[120px] rounded-xl" />
                    <Skeleton className="h-[120px] rounded-xl" />
                    <Skeleton className="h-[120px] rounded-xl" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Skeleton className="col-span-4 h-[400px] rounded-xl" />
                    <Skeleton className="col-span-3 h-[400px] rounded-xl" />
                </div>
            </div>
        </div>
    );
}
