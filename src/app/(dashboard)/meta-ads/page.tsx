// Server Component

import { Suspense } from "react";
import { getMetaTopCreatives } from "@/lib/services/meta";
import { MetaAdsClient } from "./MetaAdsClient";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";

// Enable ISR with 5 minute revalidation
export const revalidate = 300;

interface Props {
    searchParams: Promise<{
        start?: string;
        end?: string;
    }>;
}

export default async function MetaAdsPage(props: Props) {
    const searchParams = await props.searchParams;
    const startDate = searchParams.start || "30daysAgo";
    const endDate = searchParams.end || "today";

    const formatMetaDate = (str: string) => {
        const d = new Date();
        if (str === "today") return d.toISOString().split('T')[0];
        if (str === "30daysAgo") {
            d.setDate(d.getDate() - 30);
            return d.toISOString().split('T')[0];
        }
        return str;
    };

    const s = formatMetaDate(startDate);
    const e = formatMetaDate(endDate);

    const creativesResult: any = await getMetaTopCreatives(s, e);

    // Check if result is an error object
    const error = !Array.isArray(creativesResult) ? creativesResult.error : null;
    const creatives = Array.isArray(creativesResult) ? creativesResult : [];

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between py-6">
                <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">Meta Ads - Criativos</h2>
                <div className="flex items-center space-x-2">
                    <DateRangeFilter />
                </div>
            </div>

            <main className="space-y-6 overflow-y-auto w-full">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 text-red-500 font-bold mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Erro na Conexão com Meta Ads
                        </div>
                        <p className="text-red-400 text-sm font-mono">{error}</p>
                        <p className="text-red-400/70 text-xs mt-2">Verifique seu Token de Acesso em .env.local</p>
                    </div>
                )}

                <MetaAdsClient creatives={creatives} startDate={startDate} endDate={endDate} />
            </main>
        </div>
    );
}
