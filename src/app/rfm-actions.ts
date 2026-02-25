"use server";

import { getTinyOrdersWithCustomers, getTinyOrders } from "@/lib/services/tiny";
import { getWakeOrders } from "@/lib/services/wake";
import { withCache, CACHE_TTL } from "@/lib/services/cache";
import { calculateRFM, mergeOrders, RFMScore } from "@/lib/services/customers";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";

/**
 * Fetch RFM Analysis Data
 * Uses getTinyOrdersWithCustomers for accurate customer data
 */
export async function fetchRFMData(months: number = 12) {
    const endDate = format(new Date(), "yyyy-MM-dd");
    const startDate = format(subDays(new Date(), months * 30), "yyyy-MM-dd");

    return withCache(`rfm:${months}m:v4`, async () => {
        console.log(`[RFM] 📅 Fetching orders for last ${months} months`);

        try {
            // OPTIMIZED: Fetch in monthly chunks in parallel to prevent timeouts
            const chunkDates = [];
            for (let i = 0; i < months; i++) {
                chunkDates.push(subMonths(new Date(), i));
            }

            // Batch fetching of Tiny Orders
            const tinyPromises = chunkDates.map(async (date, i) => {
                // Stagger requests slightly
                await new Promise(r => setTimeout(r, i * 200));

                const start = format(startOfMonth(date), "yyyy-MM-dd");
                const end = format(endOfMonth(date), "yyyy-MM-dd");

                return getTinyOrders(start, end).catch(err => {
                    console.error(`[RFM] ❌ Failed to fetch chunk ${start}:`, err);
                    return [];
                });
            });

            const tinyChunks = await Promise.all(tinyPromises);
            const tinyOrders = tinyChunks.flat();

            const wakeOrders = await getWakeOrders(startDate, endDate).catch(err => {
                console.error(`[RFM] ❌ Error fetching Wake orders:`, err);
                return [];
            });

            console.log(`[RFM] 📦 Total Orders: ${tinyOrders.length} Tiny + ${wakeOrders?.length || 0} Wake`);

            const allOrders = mergeOrders(tinyOrders, wakeOrders || []);

            if (allOrders.length === 0) {
                console.log(`[RFM] ⚠️ No orders found for the period`);
                return [];
            }

            const rfmData = calculateRFM(allOrders);

            // Sort by monetary value (highest first)
            rfmData.sort((a, b) => b.monetary - a.monetary);

            console.log(`[RFM] 👥 Total customers analyzed: ${rfmData.length}`);

            return rfmData;
        } catch (error) {
            console.error(`[RFM] ❌ Critical error:`, error);
            return [];
        }
    }, CACHE_TTL.HOUR);
}
