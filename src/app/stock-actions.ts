"use server";

import { format, subDays, differenceInDays } from "date-fns";
import { withCache, CACHE_TTL } from "@/lib/services/cache";
import { getTopProductsByPeriod } from "@/lib/services/tiny-products";
import { getStockBatch } from "@/lib/services/stock-service";
import { getStockStatus, STOCK_RULES } from "@/lib/services/sales-forecast";
import type { StockStatus } from "@/lib/services/sales-forecast";
import { getStockHistory, saveStockSnapshots, getLastSnapshotDate } from "@/lib/services/stock-snapshots";

export interface StockOverviewItem {
    code: string;
    name: string;
    currentStock: number;
    avgMonthlySales: number;
    coverageDays: number;
    status: StockStatus | 'unknown';
    forecast3m: number;
    revenue: number;
    quantity: number;
    revenuePercentage: number;
    trend: { value: number; direction: 'up' | 'down' | 'neutral' };
}

export interface StockOverviewData {
    items: StockOverviewItem[];
    summary: {
        total: number;
        critical: number;
        warning: number;
        ok: number;
        unknown: number;
    };
}

export interface StockHistoryPoint {
    date: string;
    salesQuantity: number;
    stockLevel: number | null;
}

export interface StockHistoryData {
    timeline: StockHistoryPoint[];
    hasSnapshots: boolean;
}

/**
 * Fetch complete stock overview for all top products.
 * Combines: product sales data + Tiny stock levels + coverage calculations.
 */
export async function fetchStockOverview(
    startDate = "30daysAgo",
    endDate = "today",
    limit = 30
): Promise<StockOverviewData> {
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
    const daysDiff = Math.max(1, differenceInDays(new Date(end), new Date(start)));
    const prevEnd = format(subDays(new Date(start), 1), "yyyy-MM-dd");
    const prevStart = format(subDays(new Date(start), daysDiff + 1), "yyyy-MM-dd");

    const cacheKey = `stock:overview:v1:${start}:${end}:${limit}`;
    return withCache(cacheKey, async () => {
        console.log(`[StockOverview] Fetching: ${start} to ${end} | Prev: ${prevStart} to ${prevEnd}`);

        // 2. Fetch products (current + previous period) in parallel
        const [currentProducts, prevProducts] = await Promise.all([
            getTopProductsByPeriod(start, end, limit, 'all'),
            getTopProductsByPeriod(prevStart, prevEnd, limit, 'all'),
        ]);

        if (currentProducts.length === 0) {
            return { items: [], summary: { total: 0, critical: 0, warning: 0, ok: 0, unknown: 0 } };
        }

        // 3. Batch fetch stock levels from Tiny
        const skus = currentProducts
            .map(p => p.productId)
            .filter(id => id && id !== 'N/A' && id !== 'unknown');
        const stockMap = await getStockBatch(skus);

        // 4. Build previous period lookup
        const prevMap = new Map(prevProducts.map(p => [p.productName, p]));

        // 5. Calculate metrics for each product
        const periodMonths = Math.max(1, daysDiff / 30);
        const totalRevenue = currentProducts.reduce((sum, p) => sum + p.revenue, 0);

        const items: StockOverviewItem[] = currentProducts.map(product => {
            const stockInfo = stockMap.get(product.productId);
            const currentStock = stockInfo?.stock ?? -1;
            const hasStock = currentStock >= 0;

            // Monthly sales rate from current period
            const avgMonthlySales = Math.round(product.quantity / periodMonths);
            const dailySales = avgMonthlySales / 30;

            // Coverage
            const coverageDays = hasStock && dailySales > 0
                ? Math.round(currentStock / dailySales)
                : hasStock ? 999 : -1;

            // Status
            const status: StockStatus | 'unknown' = hasStock
                ? getStockStatus(coverageDays)
                : 'unknown';

            // Forecast: projected demand next 3 months
            const forecast3m = avgMonthlySales * 3;

            // Trend vs previous period
            const prev = prevMap.get(product.productName);
            const prevRev = prev?.revenue || 0;
            let trendValue = 0;
            let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
            if (prevRev > 0) trendValue = ((product.revenue - prevRev) / prevRev) * 100;
            else if (product.revenue > 0) trendValue = 100;
            if (trendValue > 0.5) trendDirection = 'up';
            else if (trendValue < -0.5) trendDirection = 'down';

            return {
                code: product.productId || 'N/A',
                name: product.productName,
                currentStock: hasStock ? currentStock : 0,
                avgMonthlySales,
                coverageDays: coverageDays >= 0 ? coverageDays : 0,
                status,
                forecast3m,
                revenue: product.revenue,
                quantity: Math.round(product.quantity),
                revenuePercentage: totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0,
                trend: { value: Math.abs(trendValue), direction: trendDirection },
            };
        });

        // 6. Sort: critical first, then warning, then ok, then unknown
        const statusOrder = { critical: 0, warning: 1, ok: 2, unknown: 3 };
        items.sort((a, b) => {
            const diff = statusOrder[a.status] - statusOrder[b.status];
            if (diff !== 0) return diff;
            return b.revenue - a.revenue;
        });

        // 7. Summary
        const summary = {
            total: items.length,
            critical: items.filter(i => i.status === 'critical').length,
            warning: items.filter(i => i.status === 'warning').length,
            ok: items.filter(i => i.status === 'ok').length,
            unknown: items.filter(i => i.status === 'unknown').length,
        };

        console.log(`[StockOverview] Done: ${summary.total} products | ${summary.critical} critical | ${summary.warning} warning | ${summary.ok} ok`);

        return { items, summary };
    }, CACHE_TTL.HOUR);
}

/**
 * Fetch stock history for timeline chart.
 * Combines: stock snapshots (Supabase) + sales data (Tiny).
 * If sku is provided, returns data for that specific product.
 */
export async function fetchStockHistory(
    sku?: string,
    months: number = 6
): Promise<StockHistoryData> {
    const cacheKey = `stock:history:v1:${sku || 'all'}:${months}`;
    return withCache(cacheKey, async () => {
        const snapshots = await getStockHistory(sku, months);

        // Group snapshots by date
        const byDate = new Map<string, { stockLevel: number; salesQty: number }>();

        for (const snap of snapshots) {
            const existing = byDate.get(snap.snapshot_date);
            if (sku) {
                // Single product: direct values
                byDate.set(snap.snapshot_date, {
                    stockLevel: snap.stock_level,
                    salesQty: snap.avg_monthly_sales,
                });
            } else {
                // Aggregate: sum across all SKUs
                byDate.set(snap.snapshot_date, {
                    stockLevel: (existing?.stockLevel || 0) + snap.stock_level,
                    salesQty: (existing?.salesQty || 0) + snap.avg_monthly_sales,
                });
            }
        }

        const timeline: StockHistoryPoint[] = Array.from(byDate.entries())
            .map(([date, vals]) => ({
                date,
                salesQuantity: vals.salesQty,
                stockLevel: vals.stockLevel,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
            timeline,
            hasSnapshots: snapshots.length > 0,
        };
    }, CACHE_TTL.HOUR);
}

/**
 * Save current stock data as daily snapshots.
 * Called by warmup — only saves once per day.
 */
export async function saveStockSnapshotsFromOverview(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = await getLastSnapshotDate();

    if (lastDate === today) {
        console.log(`[StockSnapshots] Already saved today (${today}), skipping`);
        return;
    }

    console.log(`[StockSnapshots] Saving daily snapshots for ${today}...`);
    const overview = await fetchStockOverview("30daysAgo", "today", 50);

    const saved = await saveStockSnapshots(overview.items);
    console.log(`[StockSnapshots] Done: ${saved} snapshots saved`);
}
