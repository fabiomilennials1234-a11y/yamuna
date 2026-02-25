import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { SystemStatus } from "@/components/diagnostics/SystemStatus";

export const dynamic = 'force-dynamic';

export default function DiagnosticsPage() {
    return (
        <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
            <div className="flex items-center justify-between py-6">
                <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
                    Diagnóstico de Sistema
                </h2>
            </div>
            <main className="overflow-y-auto w-full">
                <SystemStatus />
            </main>
        </div>
    );
}
