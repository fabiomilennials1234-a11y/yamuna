import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between space-y-2">
                <Skeleton className="h-8 w-[150px]" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-[200px] w-full rounded-xl" />
            </div>
        </div>
    );
}
