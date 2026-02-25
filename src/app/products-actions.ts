
"use server";

import { getTopProductsByPeriod, getTinyProductHistory } from "@/lib/services/tiny-products";
import { getProductSalesHistory } from "@/lib/services/sales-history";
import { generateForecast } from "@/lib/services/sales-forecast";
import { getProductStock } from "@/lib/services/stock-service";
import { format, subDays, subMonths } from "date-fns";

/**
 * Fetch top products with ABC classification
 */
export async function fetchProductsData(
    startDate = "2025-01-01",
    endDate = "today",
    limit = 50, // Increased limit for ABC
    channel: 'all' | 'b2b' | 'b2c' = 'all'
) {
    // Get actual sales from orders
    // Parse Start Date
    let start = startDate;
    if (startDate === "today") {
        start = format(new Date(), "yyyy-MM-dd");
    } else if (startDate.endsWith("daysAgo")) {
        const days = parseInt(startDate.replace("daysAgo", ""));
        if (!isNaN(days)) {
            start = format(subDays(new Date(), days), "yyyy-MM-dd");
        }
    }

    // Parse End Date
    let end = endDate;
    if (endDate === "today") {
        end = format(new Date(), "yyyy-MM-dd");
    } else if (endDate.endsWith("daysAgo")) {
        const days = parseInt(endDate.replace("daysAgo", ""));
        if (!isNaN(days)) {
            end = format(subDays(new Date(), days), "yyyy-MM-dd");
        }
    }

    // Validate Dates
    if (isNaN(new Date(start).getTime())) {
        console.error(`[fetchProductsData] Invalid start date: ${start}. Defaulting to 30 days ago.`);
        start = format(subDays(new Date(), 30), "yyyy-MM-dd");
    }
    if (isNaN(new Date(end).getTime())) {
        console.error(`[fetchProductsData] Invalid end date: ${end}. Defaulting to today.`);
        end = format(new Date(), "yyyy-MM-dd");
    }

    // Calculate Previous Period
    const daysDiff = Math.max(1, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
    const prevEnd = format(subDays(new Date(start), 1), "yyyy-MM-dd");
    const prevStart = format(subDays(new Date(start), daysDiff + 1), "yyyy-MM-dd");

    console.log(`[Products Page] 🔄 Fetching products for Current: ${start}-${end} | Previous: ${prevStart}-${prevEnd} | Channel: ${channel}`);

    // Fetch Current and Previous period data in parallel
    const [products, prevProducts] = await Promise.all([
        getTopProductsByPeriod(start, end, limit, channel),
        getTopProductsByPeriod(prevStart, prevEnd, limit, channel)
    ]);

    // Map previous products for easy lookup
    const prevProductsMap = new Map(prevProducts.map(p => [p.productName, p.revenue]));

    // Map service format to UI format
    const totalRevenue = products.reduce((acc, p: any) => acc + (p.revenue || 0), 0);
    let accumulated = 0;

    return products.map((p: any) => {
        const rev = p.revenue || 0;
        accumulated += rev;

        // ABC & Trend Calculation
        const prevRev = prevProductsMap.get(p.productName) || 0;
        let trendValue = 0;
        let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';

        if (prevRev > 0) {
            trendValue = ((rev - prevRev) / prevRev) * 100;
        } else if (rev > 0) {
            trendValue = 100;
        }

        if (trendValue > 0.5) trendDirection = 'up';
        else if (trendValue < -0.5) trendDirection = 'down';

        // ABC Classification
        const cumulativeShare = (accumulated / totalRevenue) * 100;
        let abcClass = 'C';
        if (cumulativeShare <= 80) abcClass = 'A';
        else if (cumulativeShare <= 95) abcClass = 'B';

        return {
            code: p.productId || p.code || 'N/A',
            name: p.productName || p.name || 'Unknown',
            quantity: p.itemsPurchased || p.quantity || 0,
            revenue: rev,
            revenuePercentage: totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0,
            percentage: cumulativeShare,
            abcClass,
            trend: {
                value: Math.abs(trendValue),
                direction: trendDirection
            }
        };
    });
}

/**
 * Optimized fetch for dropdowns (Names only, no trend history)
 */
export async function fetchSimpleProductList(limit = 20) {
    // defaults to last 30 days
    const endDate = format(new Date(), "yyyy-MM-dd");
    const startDate = format(subDays(new Date(), 30), "yyyy-MM-dd");

    console.log(`[SimpleList] Fetching top ${limit} products...`);

    // Just fetch current period, no comparison
    const products = await getTopProductsByPeriod(startDate, endDate, limit, 'all');

    return products.map(p => ({
        code: p.productId,
        name: p.productName
    }));
}


/**
 * NEW: Fetch ALL channels at once for instant switching
 */
import { getOmnichannelProducts } from "@/lib/services/tiny-products-omni";

export async function fetchOmniProductsData(
    startDate = "2025-01-01",
    endDate = "today",
    limit = 20
) {
    // 1. Parse Dates
    let start = startDate;
    if (startDate === "today") start = format(new Date(), "yyyy-MM-dd");
    else if (startDate.endsWith("daysAgo")) {
        const d = parseInt(startDate.replace("daysAgo", ""));
        if (!isNaN(d)) start = format(subDays(new Date(), d), "yyyy-MM-dd");
    }

    let end = endDate;
    if (endDate === "today") end = format(new Date(), "yyyy-MM-dd");
    else if (endDate.endsWith("daysAgo")) {
        const d = parseInt(endDate.replace("daysAgo", ""));
        if (!isNaN(d)) end = format(subDays(new Date(), d), "yyyy-MM-dd");
    }

    // Previous Period
    const daysDiff = Math.max(1, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
    const prevEnd = format(subDays(new Date(start), 1), "yyyy-MM-dd");
    const prevStart = format(subDays(new Date(start), daysDiff + 1), "yyyy-MM-dd");

    console.log(`[OmniProducts] 🔄 Fetching OMNI for Current: ${start}-${end} | Previous: ${prevStart}-${prevEnd}`);

    // 2. Fetch both periods in parallel (2 scans instead of 6!)
    const [current, previous] = await Promise.all([
        getOmnichannelProducts(start, end, limit),
        getOmnichannelProducts(prevStart, prevEnd, limit)
    ]);

    // 3. Helper to Process (ABC + Trend)
    const process = (currList: any[], prevList: any[]) => {
        const prevMap = new Map(prevList.map(p => [p.productName, p.revenue]));
        const totalRevenue = currList.reduce((acc, p) => acc + (p.revenue || 0), 0);
        let accumulated = 0;

        return currList.map(p => {
            const rev = p.revenue || 0;
            accumulated += rev;
            const prevRev = prevMap.get(p.productName) || 0;

            let trendValue = 0;
            let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
            if (prevRev > 0) trendValue = ((rev - prevRev) / prevRev) * 100;
            else if (rev > 0) trendValue = 100;

            if (trendValue > 0.5) trendDirection = 'up';
            else if (trendValue < -0.5) trendDirection = 'down';

            const cumulativeShare = (accumulated / totalRevenue) * 100;
            let abcClass = 'C';
            if (cumulativeShare <= 80) abcClass = 'A';
            else if (cumulativeShare <= 95) abcClass = 'B';

            return {
                code: p.productId || p.code || 'N/A',
                name: p.productName || p.name || 'Unknown',
                quantity: p.quantity || 0,
                revenue: rev,
                revenuePercentage: totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0,
                percentage: cumulativeShare,
                abcClass,
                trend: { value: Math.abs(trendValue), direction: trendDirection }
            };
        });
    };

    return {
        all: process(current.all, previous.all),
        b2b: process(current.b2b, previous.b2b),
        b2c: process(current.b2c, previous.b2c)
    };
}

/**
 * Fetch Sales Evolution (History) for a product and channel
 */
export async function fetchSalesEvolution(
    period: string, // "3months", "6months", "12months"
    channel: 'all' | 'b2b' | 'b2c',
    productName: string,
    granularity: 'month' | 'week' = 'month'
) {
    console.log(`[SalesEvolution] 📊 Fetching for: "${productName}", channel: ${channel}, granularity: ${granularity}`);

    let months = 6;
    if (period === "3months") months = 3;
    if (period === "12months") months = 12;

    // Tiny fallback needs explicit dates
    const today = new Date();
    const startDate = format(subMonths(today, months), "yyyy-MM-dd");
    const endDate = format(today, "yyyy-MM-dd"); // up to today

    let history: any[] = [];

    try {
        if (channel === 'all') {
            console.log(`[SalesEvolution] Using GA4 for 'all' channel...`);
            // Use GA4 (Fast & Accurate using sales-history service)
            history = await getProductSalesHistory(productName, granularity, startDate);

            if (history.length === 0) {
                console.warn(`[SalesEvolution] ⚠️ GA4 returned empty data. Trying Tiny as fallback...`);
                // Fallback to Tiny if GA4 fails
                // Use reduced limit of 150 orders to prevent timeout
                history = await getTinyProductHistory(productName, startDate, endDate, 'all', granularity);
            }

            console.log(`[SalesEvolution] ✅ Got ${history.length} data points for 'all' channel`);
        } else {
            console.log(`[SalesEvolution] Using Tiny for '${channel}' channel...`);
            // Use Tiny (Slow but Segmented) - Reduced limit
            history = await getTinyProductHistory(productName, startDate, endDate, channel, granularity);
            console.log(`[SalesEvolution] ✅ Got ${history.length} data points for '${channel}' channel`);
        }
    } catch (error) {
        console.error(`[SalesEvolution] ❌ Error fetching data:`, error);
        // Return empty array instead of throwing
        return [];
    }

    // Ensure chronological order
    // GA4 comes sorted by date. Tiny we reversed.
    return history;
}

/**
 * server action to fetch full analysis data for the modal
 */
export async function fetchProductAnalysis(
    productId: string,
    productName: string,
    channel: 'all' | 'b2b' | 'b2c' = 'all',
    granularity: 'month' | 'week' = 'month'
) {
    console.log(`[ProductAnalysis] Fetching data for ${productName} (${productId}) | Channel: ${channel} | Granularity: ${granularity}`);

    const [history, stockInfo] = await Promise.all([
        fetchSalesEvolution('12months', channel, productName, granularity),
        getProductStock(productId)
    ]);

    // Use NEW Forecasting Service
    const forecast = generateForecast(history);

    // Combine history + forecast (future months)
    const combinedChartData = [...history, ...forecast];

    // Calculate trailing stats
    const last6Points = history.slice(-6);
    const avgSales = last6Points.length > 0
        ? Math.round(last6Points.reduce((sum, m) => sum + m.sales, 0) / last6Points.length)
        : 0;

    const currentStock = stockInfo?.stock || 0;
    // Stock Days Logic
    // If granularity is week, avgSales is weekly. Daily sales = avgSales / 7.
    // If granularity is month, Daily sales = avgSales / 30.
    const divisor = granularity === 'week' ? 7 : 30;
    const dailySales = avgSales / divisor;

    const stockCoverageDays = dailySales > 0 ? Math.round(currentStock / dailySales) : 999;

    // Use centralized Stock Rules
    let stockStatus = 'ok';
    if (stockInfo?.stock !== undefined) {
        // Import dynamically if needed, or better, change import at top
        const { getStockStatus } = await import("@/lib/services/sales-forecast");
        stockStatus = getStockStatus(stockCoverageDays);
    }

    return {
        chartData: combinedChartData,
        stock: currentStock,
        avgMonthlySales: avgSales, // Renaming might break frontend, kept identifier but value depends on granularity
        stockCoverageDays,
        stockStatus: stockInfo?.stock === undefined ? 'unknown' : stockStatus,
        granularity // Pass back to help UI if needed
    };
}
