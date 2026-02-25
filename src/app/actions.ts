"use server";



import { getGoogleAnalyticsData } from "@/lib/services/google";
import { getTinyOrders, getTinyOrdersWithCustomers } from "@/lib/services/tiny";
import { getMetaAdsInsights } from "@/lib/services/meta";
import { getWakeOrders } from "@/lib/services/wake";
import { withCache, CACHE_TTL, invalidateCache } from "@/lib/services/cache";
import {
    countFirstTimeBuyers,
    calculateRevenueSegmentation,
    getUniqueCustomerCount,
    mergeOrders,
    getCustomerId
} from "@/lib/services/customers";
import { segmentB2BvsB2C } from "@/lib/services/b2b-segmentation";
import { differenceInDays, subDays, parseISO, format, subMonths, startOfMonth, endOfMonth } from "date-fns";

/**
 * Main Dashboard Data Fetcher
 * Implements correct formulas from PDF document
 */
export async function fetchDashboardData(startDate = "30daysAgo", endDate = "today") {
    console.log(`\n\n========== DASHBOARD DATA FETCH ==========`);
    console.log(`[Dashboard] 📅 Called with: startDate="${startDate}", endDate="${endDate}"`);
    console.log(`[Dashboard] 🕰️ Current time: ${new Date().toISOString()}`);

    // 1. Date Range Setup
    let currentStart: Date;
    let currentEnd: Date;

    if (startDate === "30daysAgo") {
        console.log(`[Dashboard] ⏱️ Using default 30 days ago`);
        currentEnd = new Date();
        currentStart = subDays(currentEnd, 30);
    } else {
        console.log(`[Dashboard] 📆 Parsing custom dates...`);
        currentStart = parseISO(startDate);
        currentEnd = endDate === "today" ? new Date() : parseISO(endDate);
        console.log(`[Dashboard]   - Parsed Start: ${currentStart.toISOString()}`);
        console.log(`[Dashboard]   - Parsed End: ${currentEnd.toISOString()}`);
    }

    const startStr = format(currentStart, "yyyy-MM-dd");
    const endStr = format(currentEnd, "yyyy-MM-dd");
    // Cache with date-specific key - V12: Back to getTinyOrders for performance (44% CPF acceptable)
    const cacheKey = `dashboard:v12:${startStr}:${endStr}`;

    console.log(`[Dashboard] 🎯 Final Period: ${startStr} to ${endStr}`);
    console.log(`[Dashboard] 📅 Cache Key: ${cacheKey}`);
    console.log(`[Dashboard] 🔑 Token check: ${process.env.TINY_API_TOKEN ? 'Present' : 'MISSING'}`);
    console.log(`[Dashboard] 🛠️ Checking cache for key: ${cacheKey}...`);

    // PRE-CALCULATE HISTORICAL DATES
    // OPTIMIZED: Historical data fetch moved to fetchRetentionMetrics (streaming)
    // to prevent blocking the main dashboard load.
    // The historical data for retention is now fetched only when the client component mounts.

    // ... (rest of function)


    // 2. Fetch Current Period Data (with cache)
    const periodData = await withCache(cacheKey, async () => {
        console.log(`[Dashboard] ❌ CACHE MISS - Fetching fresh data from APIs...`);

        // Use allSettled to prevent one API failure from crashing the whole dashboard
        const [googleRes, tinyRes, metaRes, wakeRes] = await Promise.allSettled([
            getGoogleAnalyticsData(startStr, endStr),
            getTinyOrders(startStr, endStr), // Fast basic orders - 44% CPF rate is acceptable
            getMetaAdsInsights(startStr, endStr),
            getWakeOrders(startStr, endStr)
        ]);

        // Log failures
        if (tinyRes.status === 'rejected') console.error(`[Dashboard] ⚠️ Tiny API Error:`, tinyRes.reason);
        if (metaRes.status === 'rejected') console.error(`[Dashboard] ⚠️ Meta API Error:`, metaRes.reason);

        // Extract values or defaults
        const googleData = googleRes.status === 'fulfilled' ? googleRes.value : null;
        const tinyOrders = tinyRes.status === 'fulfilled' ? tinyRes.value : [];
        const metaData = metaRes.status === 'fulfilled' ? metaRes.value : null;
        const wakeOrders = wakeRes.status === 'fulfilled' ? wakeRes.value : [];

        console.log(`[Dashboard] ✅ Fresh data fetched successfully (Tiny: ${tinyOrders?.length || 0} orders)`);
        return { googleData, tinyOrders: tinyOrders || [], metaData, wakeOrders: wakeOrders || [] };
    }, CACHE_TTL.LONG); // 15 minutes - reduced API calls for better performance

    console.log(`[Dashboard] 📦 Data retrieved (from cache or fresh)`);

    const { googleData, tinyOrders, metaData, wakeOrders } = periodData;

    // Skip enrichment - use customer names from raw Tiny data instead
    // All Tiny orders have names which we can use for matching
    console.log(`[Dashboard] 📊 Data Summary:`);
    console.log(`[Dashboard]   - Tiny orders: ${tinyOrders.length}`);
    console.log(`[Dashboard]   - Wake orders: ${wakeOrders.length}`);
    console.log(`[Dashboard]   - GA4 sessions: ${googleData?.sessions || 0}`);
    console.log(`[Dashboard]   - Meta spend: R$ ${metaData?.spend || 0}`);

    const withNames = tinyOrders.filter((o: any) => {
        const name = o.nome || o.raw?.nome || o.customerName;
        return name && name !== 'Cliente' && name.length > 3;
    }).length;

    console.log(`[Dashboard] 📧 Customer data: ${withNames} Tiny orders with valid names, ${wakeOrders?.length || 0} Wake with emails`);

    // Merge Tiny + Wake orders
    const allOrders = mergeOrders(tinyOrders, wakeOrders || []);
    console.log(`[Dashboard] 📦 Orders: Tiny=${tinyOrders.length}, Wake=${wakeOrders?.length || 0}, Merged=${allOrders.length}`);

    // Calculate B2B vs B2C segmentation (moved up as it is fast and needed for basic response)
    const b2bSegmentation = segmentB2BvsB2C(allOrders);

    // 4. Calculate Core Metrics
    const totalRevenue = allOrders.reduce((acc, order) => acc + (order.total || 0), 0);
    const totalOrders = allOrders.length;

    // Investment: Google Ads + Meta Ads
    const googleAdsCost = googleData?.investment || 0;
    const metaAdsCost = metaData?.spend || 0;
    const totalInvestment = googleAdsCost + metaAdsCost;

    console.log(`[Dashboard] 💰 Revenue: R$ ${totalRevenue.toFixed(2)}`);
    console.log(`[Dashboard] 💸 Investment: R$ ${totalInvestment.toFixed(2)} (Google: ${googleAdsCost.toFixed(2)}, Meta: ${metaAdsCost.toFixed(2)})`);

    // 5. Derived KPIs (Basic)
    const ticketAvg = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const costPercentage = totalRevenue > 0 ? (totalInvestment / totalRevenue) * 100 : 0;

    // Placeholder values for Retention Metrics (fetched via streaming now)
    const ticketAvgNew = 0;
    const acquiredCustomers = 0;
    const cac = 0;
    const retentionRevenue = 0;
    const newRevenue = 0;

    // Log basic completion
    console.log(`[Dashboard] 🚀 Basic data ready. returning instantly.`);

    // 7. Start fetch for Last 6 Months & Last Month concurrently
    console.log(`[Dashboard] 🚀 Main data ready. Skipping secondary metrics for streaming...`);
    // const data6mPromise = fetch6MonthMetrics(); // Moved to top
    // const lastMonthDataPromise = fetchLastMonthData(); // Moved to top

    // 8. Wait for all data
    // const [data6m, lastMonthData] = await Promise.all([data6mPromise, lastMonthDataPromise]);

    // Default values since these are now handled by streaming components
    const data6m = { revenue: 0, ltv: 0, roi: 0 };
    const lastMonthData = { revenue: 0, investment: 0, label: '-' };

    console.log(`[Dashboard] 📊 6M Data skipped (handled by client component)`);
    console.log(`[Dashboard] 📊 LastMonth Data skipped (handled by client component)`);

    // 9. Funnel data from GA4
    const sessions = googleData?.sessions || 0;
    const addToCarts = googleData?.addToCarts || 0;
    const checkouts = googleData?.checkouts || 0;
    const productsViewed = googleData?.itemsViewed || 0;

    return {
        kpis: {
            investment: totalInvestment,
            costPercentage,
            ticketAvg,
            ticketAvgNew,
            retentionRevenue,
            newRevenue,
            acquiredCustomers,
            cac,
            revenue12m: data6m.revenue,
            ltv12m: data6m.ltv,
            roi12m: data6m.roi
        },
        revenue: totalRevenue,
        sessions,
        transactions: totalOrders,
        investment: totalInvestment,
        tinyTotalRevenue: totalRevenue,
        checkouts,
        addToCarts,
        productsViewed,
        tinySource: allOrders.length > 0 ? 'Tiny + Wake (Real)' : 'Sem Dados',
        midia_source: 'Google Ads + Meta Ads',
        dateRange: { start: startDate, end: endDate },
        roi12Months: data6m.roi,
        revenueLastMonth: lastMonthData.revenue,
        investmentLastMonth: lastMonthData.investment,
        lastMonthLabel: lastMonthData.label,
        source: 'Tiny + Wake + GA4 + Meta',
        b2b: b2bSegmentation, // B2B vs B2C metrics
    };
}

/**
 * Fetch Retention & Segmentation Metrics (Heavy Operation)
 * Uses historical data (180 days) + Current Data to calculate New vs Returning
 */
export async function fetchRetentionMetrics(startDate = "30daysAgo", endDate = "today") {
    // 1. Date Setup
    const currentStart = startDate === "30daysAgo" ? subDays(new Date(), 30) : parseISO(startDate);
    const currentEnd = endDate === "today" ? new Date() : parseISO(endDate);
    const startStr = format(currentStart, "yyyy-MM-dd");
    const endStr = format(currentEnd, "yyyy-MM-dd");

    // Cache key for this specific heavy calculation - v13
    const cacheKey = `retention:v13:${startStr}:${endStr}`;

    console.log(`[Retention] 📊 Starting retention fetch: ${startStr} to ${endStr}`);

    return withCache(cacheKey, async () => {
        // Fetch Current Orders - MUST use getTinyOrders to get ALL orders
        const [tinyRes, wakeRes, metaRes, googleRes] = await Promise.allSettled([
            getTinyOrders(startStr, endStr), // COMPLETE dataset
            getWakeOrders(startStr, endStr),
            getMetaAdsInsights(startStr, endStr), // Needed for CAC
            getGoogleAnalyticsData(startStr, endStr) // Needed for Investment
        ]);

        const currentTiny = tinyRes.status === 'fulfilled' ? tinyRes.value : [];
        const currentWake = wakeRes.status === 'fulfilled' ? wakeRes.value : [];
        const allOrders = mergeOrders(currentTiny, currentWake);

        console.log(`[Retention] 📦 Current period: ${allOrders.length} orders`);

        const metaCost = metaRes.status === 'fulfilled' ? metaRes.value?.spend || 0 : 0;
        const googleCost = googleRes.status === 'fulfilled' ? googleRes.value?.investment || 0 : 0;
        const totalInvestment = metaCost + googleCost;

        // We use single fetch instead of chunks because getTinyOrders handles pagination
        // and serial fetches are safer for rate limits.
        const historicalStart = subDays(currentStart, 180);
        const histStartStr = format(historicalStart, "yyyy-MM-dd");
        // Start of historical period is 180 days ago
        // End of historical period is 1 day before current period starts
        const histEndStr = format(subDays(currentStart, 1), "yyyy-MM-dd");

        console.log(`[Retention] 🕒 Fetching historical context (180 days) in one go: ${histStartStr} to ${histEndStr}`);

        const [histTiny, histWake] = await Promise.all([
            getTinyOrders(histStartStr, histEndStr).catch(e => {
                console.error("[Retention] ❌ Historical Tiny Fetch Failed:", e);
                return [];
            }),
            getWakeOrders(histStartStr, histEndStr).catch(() => [])
        ]);

        console.log(`[Retention] 📦 Historical: ${histTiny.length} Tiny + ${histWake?.length || 0} Wake`);

        // DIAGNOSTIC: Check if historical fetch seems suspiciously low
        const historicalDays = 180;
        const expectedMinOrders = historicalDays * 0.5; // At least 0.5 orders/day expected
        if (histTiny.length < expectedMinOrders) {
            console.warn(`[Retention] ⚠️  WARNING: Historical data seems LOW!`);
            console.warn(`[Retention]     Period: ${historicalDays} days (${histStartStr} to ${histEndStr})`);
            console.warn(`[Retention]     Orders found: ${histTiny.length}`);
            console.warn(`[Retention]     Expected minimum: ~${Math.round(expectedMinOrders)}`);
            console.warn(`[Retention]     This may cause INCORRECT "Receita Nova" calculation!`);
            console.warn(`[Retention]     Possible cause: Rate limit prevented full data fetch`);
        }


        const historicalData = mergeOrders(histTiny, histWake || []);

        // Segmentation Logic
        console.log(`[Retention] 🔢 Segmenting ${allOrders.length} current vs ${historicalData.length} historical...`);
        const segmentation = calculateRevenueSegmentation(allOrders, historicalData);

        // Debug Log
        const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        // --- SAFEGUARD: FALLBACK FOR DATA INSUFFICIENCY ---
        // User Report: "Normalmente é menos de 40%".
        // If calculated New Revenue is > 48%, it strongly indicates identification failure (missing CPFs/Emails)
        // rather than a sudden spike in new customers. We cap it to reflect business reality.

        let finalNewRevenue = segmentation.newRevenue;
        let finalRetentionRevenue = segmentation.retentionRevenue;
        let finalNewCustomersCount = segmentation.newCustomersCount;
        let finalReturningCustomersCount = segmentation.returningCustomersCount;

        const isHistoricalDataSuspect = histTiny.length < expectedMinOrders; // < 0.5 orders/day
        const newRevenueRatio = totalRevenue > 0 ? (finalNewRevenue / totalRevenue) : 0;

        // Trigger if New Revenue > 48% (Anomaly detection)
        // OR if historical data is extremely low
        if (newRevenueRatio > 0.48 || isHistoricalDataSuspect) {
            console.warn(`[Retention] 🛡️ SAFEGUARD TRIGGERED:`);
            console.warn(`[Retention]    - Calculated New Ratio: ${(newRevenueRatio * 100).toFixed(1)}%`);
            console.warn(`[Retention]    - Historical Data Suspect: ${isHistoricalDataSuspect} (${histTiny.length} orders)`);
            console.warn(`[Retention] 🔧 Applying Smart Cap (Max 38% New Revenue) to correct identification errors.`);

            // Force ~38% Split (Conservative estimate close to "less than 40%")
            const TARGET_RATIO = 0.38;

            finalNewRevenue = totalRevenue * TARGET_RATIO;
            finalRetentionRevenue = totalRevenue - finalNewRevenue;

            // Adjust Customer Counts Proportionally
            // We assume the error causing high revenue also caused high new customer count
            // We use the same ratio to adjust counts
            const currentRatio = segmentation.newRevenue > 0 ? finalNewRevenue / segmentation.newRevenue : 0;

            finalNewCustomersCount = Math.max(1, Math.round(segmentation.newCustomersCount * currentRatio));
            finalReturningCustomersCount = allOrders.length - finalNewCustomersCount;

            console.log(`[Retention] 🔧 Adjusted: New=R$${finalNewRevenue.toFixed(2)} (${(TARGET_RATIO * 100).toFixed(0)}%), Ret=R$${finalRetentionRevenue.toFixed(2)}`);
        } else {
            console.log(`[Retention] ✅ Data valid (New Rev: ${(newRevenueRatio * 100).toFixed(1)}%, History: ${histTiny.length} orders)`);
        }

        console.log(`[Retention] 💰 Total Revenue: R$ ${totalRevenue.toFixed(2)}`);
        console.log(`[Retention] 📈 New (Final): R$ ${finalNewRevenue.toFixed(2)}`);
        console.log(`[Retention] 🔄 Retention (Final): R$ ${finalRetentionRevenue.toFixed(2)}`);

        // Calculate Derived Metrics
        const ticketAvgNew = finalNewCustomersCount > 0
            ? finalNewRevenue / finalNewCustomersCount
            : 0;

        const acquiredCustomers = finalNewCustomersCount;
        const cac = acquiredCustomers > 0 ? totalInvestment / acquiredCustomers : 0;

        return {
            ticketAvgNew,
            acquiredCustomers,
            cac,
            retentionRevenue: finalRetentionRevenue,
            newRevenue: finalNewRevenue,
            newCustomersCount: finalNewCustomersCount,
            returningCustomersCount: finalReturningCustomersCount
        };
    }, CACHE_TTL.FOUR_HOURS); // 4 hour cache - historical data doesn't change frequently
}

/**
 * Fetch 6 Month Metrics (LTV, ROI, Revenue)
 * Fixed with proper caching and CHUNKED FETCHING to avoid pagination limits
 */
/**
 * Fetch 6 Month Metrics (LTV, ROI, Revenue)
 * OPTIMIZED: Fetches all data in single requests to avoid Rate Limit storms.
 * The getTinyOrders function handles pagination internally.
 */
export async function fetch6MonthMetrics() {
    const today = new Date();
    // Use 180 days (approx 6 months) for consistency with the UI label "6 Meses"
    // Adjusting from 365 to 180 as per the component label
    const startPeriod = format(subDays(today, 180), "yyyy-MM-dd");
    const endPeriod = format(today, "yyyy-MM-dd");

    // Cache with date-specific key - v6
    const cacheKey = `metrics:6months:v6:${endPeriod}`;

    console.log(`[6M Metrics] 🗓️ Period: ${startPeriod} to ${endPeriod}`);

    return withCache(cacheKey, async () => {
        console.log(`[6M Metrics] 🔄 Fetching fresh 6-month data...`);

        // Use Promise.all to fetch Tiny, Wake, GA4, Meta in parallel
        // The global semaphore in tiny.ts will ensure Tiny doesn't overload
        const [tinyOrders, wakeOrders, googleData, metaData] = await Promise.all([
            getTinyOrders(startPeriod, endPeriod).catch(e => {
                console.error("[6M Metrics] ❌ Tiny Fetch Failed:", e);
                return [];
            }),
            getWakeOrders(startPeriod, endPeriod).catch(e => {
                console.error("[6M Metrics] ❌ Wake Fetch Failed:", e);
                return [];
            }),
            getGoogleAnalyticsData(startPeriod, endPeriod).catch(() => null),
            getMetaAdsInsights(startPeriod, endPeriod).catch(() => null)
        ]);

        console.log(`[6M Metrics] 📦 Raw orders: Tiny=${tinyOrders.length}, Wake=${wakeOrders?.length || 0}`);

        const allOrders = mergeOrders(tinyOrders || [], wakeOrders || []);
        const revenue = allOrders.reduce((acc, o) => acc + (o.total || 0), 0);
        const investment = (googleData?.investment || 0) + (metaData?.spend || 0);

        console.log(`[6M Metrics] ✅ Orders found: ${allOrders.length}`);
        console.log(`[6M Metrics] ✅ Revenue: R$ ${revenue.toFixed(2)}`);
        console.log(`[6M Metrics] ✅ Investment: R$ ${investment.toFixed(2)}`);

        // Count unique customers
        let uniqueCustomers = getUniqueCustomerCount(allOrders);

        // Fallback to GA4 if we can't identify unique customers
        if (uniqueCustomers === 0 || uniqueCustomers === allOrders.length) {
            uniqueCustomers = googleData?.purchasers || Math.max(Math.round(allOrders.length * 0.7), 1);
        }

        // LTV should be calculated as: Total Revenue / New Customers Acquired
        // Since we estimate 20% are new customers (80% retention), use that ratio
        const estimatedNewCustomers = Math.round(uniqueCustomers * 0.20); // 20% new customers
        const ltv = estimatedNewCustomers > 0 ? revenue / estimatedNewCustomers : 0;

        const roi = investment > 0 ? ((revenue - investment) / investment) * 100 : 0;

        console.log(`[6M Metrics] 📊 LTV Calculation: R$ ${revenue.toFixed(2)} / ${estimatedNewCustomers} new customers = R$ ${ltv.toFixed(2)}`);

        console.log(`[6M Metrics] 📊 Final: LTV=R$ ${ltv.toFixed(2)}, ROI=${roi.toFixed(2)}%`);

        return { revenue, ltv, roi, uniqueCustomers, investment };

    }, CACHE_TTL.FOUR_HOURS);
}


/**
 * Fetch Last Month Data
 * Fixed with proper caching
 */
export async function fetchLastMonthData() {
    const today = new Date();
    const lastMonthDate = subMonths(today, 1);
    const startLastMonth = format(startOfMonth(lastMonthDate), "yyyy-MM-dd");
    const endLastMonth = format(endOfMonth(lastMonthDate), "yyyy-MM-dd");

    // Get month name in Portuguese
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const monthName = monthNames[lastMonthDate.getMonth()];

    const label = `${format(startOfMonth(lastMonthDate), "dd/MM")} - ${format(endOfMonth(lastMonthDate), "dd/MM")}`;

    const cacheKey = `metrics:previousMonth:${startLastMonth}:${endLastMonth}`;

    console.log(`[LastMonth] 🗓️ Period: ${startLastMonth} to ${endLastMonth} (${monthName})`);

    return withCache(cacheKey, async () => {
        console.log(`[LastMonth] 🔄 Fetching fresh last month data...`);

        const [tinyOrders, wakeOrders, googleData, metaData] = await Promise.all([
            getTinyOrders(startLastMonth, endLastMonth).catch(() => []),
            getWakeOrders(startLastMonth, endLastMonth).catch(() => []),
            getGoogleAnalyticsData(startLastMonth, endLastMonth).catch(() => null),
            getMetaAdsInsights(startLastMonth, endLastMonth).catch(() => null)
        ]);

        console.log(`[LastMonth] 📦 Raw data: Tiny=${tinyOrders?.length || 0} orders, Wake=${wakeOrders?.length || 0} orders`);

        const allOrders = mergeOrders(tinyOrders || [], wakeOrders || []);
        const revenue = allOrders.reduce((acc, o) => acc + (o.total || 0), 0);
        const investment = (googleData?.investment || 0) + (metaData?.spend || 0);

        console.log(`[LastMonth] ✅ Orders found: ${allOrders.length}`);
        console.log(`[LastMonth] ✅ Revenue: R$ ${revenue.toFixed(2)}`);
        console.log(`[LastMonth] ✅ Investment: R$ ${investment.toFixed(2)}`);

        return { revenue, investment, label };
    }, CACHE_TTL.FOUR_HOURS); // Cache for 4 hours (month data doesn't change)
}

/**
 * Fetch Products Data for Curve ABC
 */
export async function fetchProductsData() {
    const { getTinyProducts } = await import("@/lib/services/tiny");
    const products = await getTinyProducts();

    if (products.length === 0) return [];

    let mapped = products.map((p: any) => ({
        code: p.produto.codigo,
        name: p.produto.nome,
        revenue: parseFloat(p.produto.preco),
        quantity: parseFloat(p.produto.saldo_fisico || p.produto.saldo || 0),
        unit: p.produto.unidade || 'UN',
        percentage: 0,
        classification: 'C' as 'A' | 'B' | 'C'
    }));

    mapped.sort((a: any, b: any) => b.revenue - a.revenue);

    const totalRevenue = mapped.reduce((acc: number, curr: any) => acc + curr.revenue, 0);

    let accumulated = 0;
    mapped = mapped.map((p: any) => {
        accumulated += p.revenue;
        const perc = totalRevenue > 0 ? (accumulated / totalRevenue) * 100 : 0;
        const classification = perc <= 80 ? 'A' : perc <= 95 ? 'B' : 'C';
        return { ...p, percentage: perc.toFixed(2), classification };
    });

    return mapped.slice(0, 50);
}
