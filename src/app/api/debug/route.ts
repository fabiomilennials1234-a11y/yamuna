import { NextResponse } from 'next/server';
import { getTinyOrdersWithCustomers } from "@/lib/services/tiny";
import { getWakeOrders } from "@/lib/services/wake";
import { getGoogleAnalyticsData } from "@/lib/services/google";
import { getMetaAdsInsights } from "@/lib/services/meta";
import {
    mergeOrders,
    getCustomerId,
    getCustomerName,
    calculateRevenueSegmentation
} from "@/lib/services/customers";
import { invalidateCache, getCacheStats } from "@/lib/services/cache";
import { format, subDays } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const startDate = url.searchParams.get('start') || format(subDays(new Date(), 30), "yyyy-MM-dd");
    const endDate = url.searchParams.get('end') || format(new Date(), "yyyy-MM-dd");

    // Clear cache if requested
    if (action === 'clear_cache') {
        await invalidateCache();
        return NextResponse.json({
            success: true,
            message: "Cache cleared!",
            stats: getCacheStats()
        });
    }

    console.log(`[Debug API] Fetching data from ${startDate} to ${endDate}`);

    try {
        // Fetch all data sources in parallel
        const [tinyOrders, wakeOrders, googleData, metaData] = await Promise.all([
            getTinyOrdersWithCustomers(startDate, endDate),
            getWakeOrders(startDate, endDate),
            getGoogleAnalyticsData(startDate, endDate),
            getMetaAdsInsights(startDate, endDate)
        ]);

        // Merge orders
        const allOrders = mergeOrders(tinyOrders || [], wakeOrders || []);

        // Check orders with customer IDs
        const ordersWithCustomerId = allOrders.filter(o => {
            const customerId = getCustomerId(o);
            return customerId && !customerId.startsWith('unknown_') && !customerId.startsWith('wake_customer_');
        });

        // Calculate revenue
        const totalRevenue = allOrders.reduce((acc, order) => acc + (order.total || 0), 0);

        // Sample orders for debugging
        const sampleOrders = allOrders.slice(0, 5).map(o => ({
            id: o.id,
            total: o.total,
            customerId: getCustomerId(o),
            customerName: getCustomerName(o),
            date: o.date || o.orderDate,
            hasCustomerData: !getCustomerId(o).startsWith('unknown_'),
            raw: o.raw || o // Include raw data for debugging
        }));

        // Calculate transactions from GA4
        const ga4Transactions = googleData?.transactions || 0;

        return NextResponse.json({
            summary: {
                period: { start: startDate, end: endDate },
                totalOrders: allOrders.length,
                tinyOrders: tinyOrders?.length || 0,
                wakeOrders: wakeOrders?.length || 0,
                ordersWithCustomerId: ordersWithCustomerId.length,
                totalRevenue: totalRevenue,
                ga4Transactions: ga4Transactions,
            },
            dataQuality: {
                percentageWithCustomerId: allOrders.length > 0
                    ? ((ordersWithCustomerId.length / allOrders.length) * 100).toFixed(1) + '%'
                    : '0%',
                issue: ordersWithCustomerId.length === 0
                    ? "⚠️ NO CUSTOMER IDS FOUND - Will use GA4 fallback (may cause zeros)"
                    : ordersWithCustomerId.length < allOrders.length * 0.5
                        ? "⚠️ Low customer ID coverage - Some metrics may be inaccurate"
                        : "✅ Good customer ID coverage"
            },
            sources: {
                tiny: {
                    configured: !!process.env.TINY_API_TOKEN,
                    orders: tinyOrders?.length || 0,
                },
                wake: {
                    configured: !!process.env.WAKE_API_URL && !!process.env.WAKE_API_TOKEN,
                    orders: wakeOrders?.length || 0,
                },
                ga4: {
                    configured: !!process.env.GA4_PROPERTY_ID && !!process.env.GOOGLE_REFRESH_TOKEN,
                    sessions: googleData?.sessions || 0,
                    transactions: googleData?.transactions || 0,
                    newUsers: googleData?.newUsers || 0,
                    purchasers: googleData?.purchasers || 0,
                    investment: googleData?.investment || 0,
                    addToCarts: googleData?.addToCarts || 0,
                    checkouts: googleData?.checkouts || 0,
                },
                meta: {
                    configured: !!process.env.META_ACCESS_TOKEN,
                    spend: metaData?.spend || 0,
                }
            },
            sampleOrders,
            cache: getCacheStats()
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
