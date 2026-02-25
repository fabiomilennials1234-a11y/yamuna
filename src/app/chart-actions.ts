"use server";

import { getGA4DailySessions } from "@/lib/services/ga4-reports";
import { format, subDays } from "date-fns";

export async function fetchChartData(timeRange: string) {
    // Calculate date range based on selection
    const endDate = format(new Date(), 'yyyy-MM-dd');
    let startDate: string;

    switch (timeRange) {
        case "90d":
            startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
            break;
        case "30d":
            startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
            break;
        case "7d":
        default:
            startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
            break;
    }

    console.log(`[Chart Data] Fetching from ${startDate} to ${endDate}`);

    const data = await getGA4DailySessions(startDate, endDate);

    return data || [];
}
