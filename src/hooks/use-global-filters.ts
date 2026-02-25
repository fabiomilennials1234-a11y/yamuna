"use client";

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format, startOfMonth } from 'date-fns';

const FILTER_STORAGE_KEY = "dashboard-date-filter";

/**
 * Hook to automatically apply stored filters to page URLs.
 * Falls back to current month if nothing is stored.
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

        if (stored) {
            try {
                const { startStr, endStr } = JSON.parse(stored);
                if (startStr && endStr) {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("start", startStr);
                    params.set("end", endStr);
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                    return;
                }
            } catch (err) {
                console.error('[useGlobalFilters] Failed to parse stored filter', err);
            }
        }

        // No stored filter — default to current month
        const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const end = format(new Date(), 'yyyy-MM-dd');
        const params = new URLSearchParams(searchParams.toString());
        params.set("start", start);
        params.set("end", end);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]); // Only run when pathname changes

    return null;
}
