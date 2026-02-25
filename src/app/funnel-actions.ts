"use server";

import { getGoogleAnalyticsData } from "@/lib/services/google";
import { getTinyOrders } from "@/lib/services/tiny";
import { getMetaAdsInsights } from "@/lib/services/meta";
import { getWakeOrders } from "@/lib/services/wake";
import { getTopProductsByPeriod } from "@/lib/services/tiny-products";
// Using local storage instead of Supabase for goals
import { getCurrentMonthGoalLocal, getPreviousMonthGoalLocal, saveMonthlyGoalLocal } from "@/app/goals-local";
import { withCache, CACHE_TTL } from "@/lib/services/cache";
import { mergeOrders, getUniqueCustomerCount } from "@/lib/services/customers";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, subDays } from "date-fns";

/**
 * Fetch Funnel Data with correct calculations
 */
export async function fetchFunnelData(startDate = "30daysAgo", endDate = "today") {
    console.log(`[Funnel] 📅 Called with: startDate="${startDate}", endDate="${endDate}"`);

    // 1. Date Range Setup
    let currentStart: Date;
    let currentEnd: Date;

    if (startDate === "30daysAgo") {
        currentEnd = new Date();
        currentStart = subDays(currentEnd, 30);
    } else {
        currentStart = parseISO(startDate);
        currentEnd = endDate === "today" ? new Date() : parseISO(endDate);
    }

    const startStr = format(currentStart, "yyyy-MM-dd");
    const endStr = format(currentEnd, "yyyy-MM-dd");

    console.log(`[Funnel] 📅 Period: ${startStr} to ${endStr}`);

    // 2. Current month range
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const currentMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const currentMonthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

    // 3. Previous month range
    const prevMonthDate = subMonths(new Date(), 1);
    const prevMonth = prevMonthDate.getMonth() + 1;
    const prevYear = prevMonthDate.getFullYear();
    const prevMonthStart = format(startOfMonth(prevMonthDate), "yyyy-MM-dd");
    const prevMonthEnd = format(endOfMonth(prevMonthDate), "yyyy-MM-dd");

    // 4. Parallel fetch all data with cache
    const [
        selectedPeriod,
        currentMonthData,
        prevMonthData,
        currentGoal,
        prevGoal
    ] = await Promise.all([
        // Selected period data
        withCache(`funnel:selected:${startStr}:${endStr}`, async () => {
            const [ga4, tiny, wake, products] = await Promise.all([
                getGoogleAnalyticsData(startStr, endStr).catch(err => { console.error('[Funnel] GA4 error:', err); return null; }),
                getTinyOrders(startStr, endStr).catch(err => { console.error('[Funnel] Tiny error:', err); return []; }),
                getWakeOrders(startStr, endStr).catch(err => { console.error('[Funnel] Wake error:', err); return []; }),
                getTopProductsByPeriod(startStr, endStr, 10).catch(err => { console.error('[Funnel] Products error:', err); return []; })
            ]);
            return { ga4, tiny: tiny || [], wake: wake || [], products };
        }, CACHE_TTL.MEDIUM),

        // Current month data
        withCache(`funnel:currentMonth:${currentMonthStart}`, async () => {
            const [ga4, meta, tiny, wake] = await Promise.all([
                getGoogleAnalyticsData(currentMonthStart, currentMonthEnd).catch(() => null),
                getMetaAdsInsights(currentMonthStart, currentMonthEnd).catch(() => null),
                getTinyOrders(currentMonthStart, currentMonthEnd).catch(() => []),
                getWakeOrders(currentMonthStart, currentMonthEnd).catch(() => [])
            ]);
            return { ga4, meta, tiny: tiny || [], wake: wake || [] };
        }, CACHE_TTL.MEDIUM),

        // Previous month data
        withCache(`funnel:prevMonth:${prevMonthStart}`, async () => {
            const [ga4, meta, tiny, wake] = await Promise.all([
                getGoogleAnalyticsData(prevMonthStart, prevMonthEnd).catch(() => null),
                getMetaAdsInsights(prevMonthStart, prevMonthEnd).catch(() => null),
                getTinyOrders(prevMonthStart, prevMonthEnd).catch(() => []),
                getWakeOrders(prevMonthStart, prevMonthEnd).catch(() => [])
            ]);
            return { ga4, meta, tiny: tiny || [], wake: wake || [] };
        }, CACHE_TTL.LONG),

        getCurrentMonthGoalLocal(),
        getPreviousMonthGoalLocal()
    ]);

    // 5. Merge orders from Tiny + Wake
    const selectedOrders = mergeOrders(selectedPeriod.tiny, selectedPeriod.wake);
    const currentMonthOrders = mergeOrders(currentMonthData.tiny, currentMonthData.wake);
    const prevMonthOrders = mergeOrders(prevMonthData.tiny, prevMonthData.wake);

    // 6. Calculate selected period metrics
    const selectedSessions = selectedPeriod.ga4?.sessions || 0;
    const selectedAddToCarts = selectedPeriod.ga4?.addToCarts || 0;
    const selectedCheckouts = selectedPeriod.ga4?.checkouts || 0;
    const selectedTransactions = selectedOrders.length;
    const selectedRevenue = selectedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    console.log(`[Funnel] Selected Period:`);
    console.log(`  - Transactions: ${selectedTransactions}`);
    console.log(`  - Revenue: R$ ${selectedRevenue.toFixed(2)}`);
    console.log(`  - Sessions: ${selectedSessions}`);

    // 7. Calculate current month metrics
    const currentMonthRevenue = currentMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const currentMonthTransactions = currentMonthOrders.length;
    const currentMonthInvestment = (currentMonthData.ga4?.investment || 0) + (currentMonthData.meta?.spend || 0);

    // 8. Calculate previous month metrics
    const prevMonthRevenue = prevMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const prevMonthTransactions = prevMonthOrders.length;
    const prevMonthInvestment = (prevMonthData.ga4?.investment || 0) + (prevMonthData.meta?.spend || 0);

    // 9. Calculate funnel rates (CORRECT formulas from PDF)
    // Taxa_Carrinho = add_to_cart / sessões * 100
    const cartRate = selectedSessions > 0 ? (selectedAddToCarts / selectedSessions) * 100 : 0;
    // Taxa_Checkout = checkouts / add_to_cart * 100
    const checkoutRate = selectedAddToCarts > 0 ? (selectedCheckouts / selectedAddToCarts) * 100 : 0;
    // Taxa_Transação = transactions / checkouts * 100
    const transactionRate = selectedCheckouts > 0 ? (selectedTransactions / selectedCheckouts) * 100 : 0;
    // Taxa_Conversão = transactions / sessões * 100
    const conversionRate = selectedSessions > 0 ? (selectedTransactions / selectedSessions) * 100 : 0;

    // 10. Calculate averages
    const avgTicket = selectedTransactions > 0 ? selectedRevenue / selectedTransactions : 0;
    // Sessões_por_carrinho = sessões / add_to_cart
    const sessionsPerCart = selectedAddToCarts > 0 ? selectedSessions / selectedAddToCarts : 0;

    // 11. Calculate projections
    const daysInMonth = endOfMonth(new Date()).getDate();
    const currentDay = new Date().getDate();

    const projectedRevenue = currentDay > 0 ? (currentMonthRevenue / currentDay) * daysInMonth : 0;
    const projectedTransactions = currentDay > 0 ? Math.round((currentMonthTransactions / currentDay) * daysInMonth) : 0;

    const revenueGoalPercent = currentGoal?.revenue_goal && currentGoal.revenue_goal > 0
        ? (projectedRevenue / currentGoal.revenue_goal) * 100
        : 0;

    const prevRevenueGoalPercent = prevGoal?.revenue_goal && prevGoal.revenue_goal > 0
        ? (prevMonthRevenue / prevGoal.revenue_goal) * 100
        : 0;

    // 12. Calculate historical averages for projections
    // Use previous month as historical baseline
    const prevMonthSessions = prevMonthData.ga4?.sessions || 0;
    const historicalConversionRate = prevMonthSessions > 0
        ? (prevMonthTransactions / prevMonthSessions) * 100
        : conversionRate; // Fallback to current

    const historicalAvgTicket = prevMonthTransactions > 0
        ? prevMonthRevenue / prevMonthTransactions
        : avgTicket;

    const historicalROAS = prevMonthInvestment > 0
        ? prevMonthRevenue / prevMonthInvestment
        : (currentMonthInvestment > 0 ? currentMonthRevenue / currentMonthInvestment : 3.0); // Default ROAS

    console.log(`[Funnel] 📊 Historical: Conv=${historicalConversionRate.toFixed(2)}%, Ticket=R$ ${historicalAvgTicket.toFixed(2)}, ROAS=${historicalROAS.toFixed(2)}x`);

    return {
        // Selected period funnel
        selectedPeriod: {
            sessions: selectedSessions,
            addToCarts: selectedAddToCarts,
            checkouts: selectedCheckouts,
            transactions: selectedTransactions,
            revenue: selectedRevenue,
            cartRate,
            checkoutRate,
            transactionRate,
            conversionRate,
            avgTicket,
            sessionsPerCart,
            products: selectedPeriod.products
        },
        // Current month
        currentMonth: {
            month: currentMonth,
            year: currentYear,
            revenue: currentMonthRevenue,
            transactions: currentMonthTransactions,
            investment: currentMonthInvestment,
            avgTicket: currentMonthTransactions > 0 ? currentMonthRevenue / currentMonthTransactions : 0,
            projectedRevenue,
            projectedTransactions,
            goal: currentGoal,
            revenueGoalPercent,
            daysElapsed: currentDay,
            daysInMonth
        },
        // Previous month
        previousMonth: {
            month: prevMonth,
            year: prevYear,
            revenue: prevMonthRevenue,
            transactions: prevMonthTransactions,
            investment: prevMonthInvestment,
            avgTicket: prevMonthTransactions > 0 ? prevMonthRevenue / prevMonthTransactions : 0,
            goal: prevGoal,
            revenueGoalPercent: prevRevenueGoalPercent
        },
        // Historical averages for projections
        historical: {
            conversionRate: historicalConversionRate,
            avgTicket: historicalAvgTicket,
            roas: historicalROAS
        }
    };
}

/**
 * Save Monthly Goal (Server Action)
 * Using local storage instead of Supabase
 */
export async function saveMonthlyGoal(
    month: number,
    year: number,
    revenueGoal: number,
    transactionsGoal: number,
    adBudgetGoal: number = 0
) {
    "use server";
    try {
        console.log(`[Save Goal] Saving: Month=${month}, Year=${year}, Revenue=${revenueGoal}`);
        const result = await saveMonthlyGoalLocal(month, year, revenueGoal, transactionsGoal, adBudgetGoal);

        console.log('[Save Goal] ✅ Saved successfully');
        return { success: true, data: result };
    } catch (error: any) {
        console.error("[Save Goal] ❌ Error:", error);
        return { success: false, error: error?.message || 'Unknown error' };
    }
}
