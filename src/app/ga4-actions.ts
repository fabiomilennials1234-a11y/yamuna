"use server";

import { getGA4Demographics, getGA4SourceMedium } from "@/lib/services/ga4-reports";
import { withCache, CACHE_TTL } from "@/lib/services/cache";
import { format, subDays, parseISO } from "date-fns";

/**
 * Fetch GA4 Demographics (Público-alvo) data
 */
export async function fetchDemographicsData(startDate = "30daysAgo", endDate = "today") {
    let startStr: string;
    let endStr: string;

    if (startDate === "30daysAgo") {
        const now = new Date();
        endStr = format(now, "yyyy-MM-dd");
        startStr = format(subDays(now, 30), "yyyy-MM-dd");
    } else {
        startStr = startDate;
        endStr = endDate === "today" ? format(new Date(), "yyyy-MM-dd") : endDate;
    }

    return withCache(`ga4:demographics:${startStr}:${endStr}`, async () => {
        console.log(`[Demographics] Fetching data for ${startStr} to ${endStr}`);
        const data = await getGA4Demographics(startStr, endStr);
        return data;
    }, CACHE_TTL.MEDIUM);
}

/**
 * Fetch GA4 Source/Medium (Origem/Mídia) data
 */
export async function fetchSourceMediumData(startDate = "30daysAgo", endDate = "today") {
    let startStr: string;
    let endStr: string;

    if (startDate === "30daysAgo") {
        const now = new Date();
        endStr = format(now, "yyyy-MM-dd");
        startStr = format(subDays(now, 30), "yyyy-MM-dd");
    } else {
        startStr = startDate;
        endStr = endDate === "today" ? format(new Date(), "yyyy-MM-dd") : endDate;
    }

    return withCache(`ga4:sourceMedium:${startStr}:${endStr}`, async () => {
        console.log(`[Source/Medium] Fetching data for ${startStr} to ${endStr}`);
        const data = await getGA4SourceMedium(startStr, endStr);
        return data;
    }, CACHE_TTL.MEDIUM);
}

/**
 * Fetch Email & SMS Performance (Edrone)
 */
export async function fetchEmailSmsData(startDate = "30daysAgo", endDate = "today") {
    let startStr: string;
    let endStr: string;

    if (startDate === "30daysAgo") {
        const now = new Date();
        endStr = format(now, "yyyy-MM-dd");
        startStr = format(subDays(now, 30), "yyyy-MM-dd");
    } else {
        startStr = startDate;
        endStr = endDate === "today" ? format(new Date(), "yyyy-MM-dd") : endDate;
    }

    return withCache(`ga4:emailSms:${startStr}:${endStr}`, async () => {
        const { getGA4EmailSmsPerformance } = await import("@/lib/services/ga4-reports");
        console.log(`[Email/SMS] Fetching data for ${startStr} to ${endStr}`);
        return await getGA4EmailSmsPerformance(startStr, endStr);
    }, CACHE_TTL.MEDIUM);
}
