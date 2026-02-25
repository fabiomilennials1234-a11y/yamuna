import { LoadingScreen } from "@/components/ui/loading-spinner";

export default function Loading() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between py-6">
                <div className="h-10 w-48 bg-muted/50 rounded animate-pulse" />
            </div>
            <LoadingScreen />
        </div>
    );
}
