"use client";

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const FILTER_STORAGE_KEY = "dashboard-date-filter";

/**
 * Hook to automatically apply stored filters to page URLs
 * This ensures filters persist across all pages in the dashboard
 */
export function useGlobalFilters() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Skip if we already have filter params in URL
        if (searchParams.get("start") && searchParams.get("end")) {
            return;
        }

        // Try to load from localStorage
        const stored = localStorage.getItem(FILTER_STORAGE_KEY);
        if (!stored) return;

        try {
            const { startStr, endStr } = JSON.parse(stored);

            // Only apply if we have valid dates
            if (startStr && endStr && startStr !== '30daysAgo' && endStr !== 'today') {
                const params = new URLSearchParams(searchParams.toString());
                params.set("start", startStr);
                params.set("end", endStr);

                console.log(`[useGlobalFilters] Auto-applying stored filter to ${pathname}`);

                // Use replace to avoid adding to history
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            }
        } catch (err) {
            console.error('[useGlobalFilters] Failed to parse stored filter', err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]); // Only run when pathname changes - ignore searchParams/router to prevent loops

    return null;
}
