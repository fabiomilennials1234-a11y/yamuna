"use client";

import { useGlobalFilters } from "@/hooks/use-global-filters";

/**
 * Client component to enable global filter management
 * Include this in the dashboard layout to persist filters across pages
 */
export function GlobalFilterManager() {
    useGlobalFilters();
    return null;
}
