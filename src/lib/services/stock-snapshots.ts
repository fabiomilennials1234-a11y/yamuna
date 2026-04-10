// src/lib/services/stock-snapshots.ts
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
    )
    : null;

export interface StockSnapshotRow {
    sku: string;
    product_name: string;
    stock_level: number;
    avg_monthly_sales: number;
    coverage_days: number;
    status: string;
    snapshot_date: string;
}

/**
 * Check if snapshots have already been saved today.
 * Returns the latest snapshot_date or null.
 */
export async function getLastSnapshotDate(): Promise<string | null> {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('stock_snapshots')
            .select('snapshot_date')
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) return null;
        return data.snapshot_date;
    } catch {
        return null;
    }
}

/**
 * Upsert stock snapshot rows for today.
 * Uses ON CONFLICT (sku, snapshot_date) to avoid duplicates.
 */
export async function saveStockSnapshots(
    items: Array<{
        code: string;
        name: string;
        currentStock: number;
        avgMonthlySales: number;
        coverageDays: number;
        status: string;
    }>
): Promise<number> {
    if (!supabase || items.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];

    const rows: StockSnapshotRow[] = items
        .filter(item => item.code && item.code !== 'N/A')
        .map(item => ({
            sku: item.code,
            product_name: item.name,
            stock_level: item.currentStock,
            avg_monthly_sales: item.avgMonthlySales,
            coverage_days: Math.min(item.coverageDays, 999),
            status: item.status,
            snapshot_date: today,
        }));

    try {
        const { error } = await supabase
            .from('stock_snapshots')
            .upsert(rows, { onConflict: 'sku,snapshot_date' });

        if (error) {
            console.error('[StockSnapshots] Upsert error:', error.message);
            return 0;
        }

        console.log(`[StockSnapshots] Saved ${rows.length} snapshots for ${today}`);
        return rows.length;
    } catch (err) {
        console.error('[StockSnapshots] Error:', err);
        return 0;
    }
}

/**
 * Query stock history for timeline chart.
 * If sku is provided, returns series for that product.
 * If not, returns aggregated totals per date.
 */
export async function getStockHistory(
    sku?: string,
    months: number = 6
): Promise<StockSnapshotRow[]> {
    if (!supabase) return [];

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    try {
        let query = supabase
            .from('stock_snapshots')
            .select('sku, product_name, stock_level, avg_monthly_sales, coverage_days, status, snapshot_date')
            .gte('snapshot_date', cutoffStr)
            .order('snapshot_date', { ascending: true });

        if (sku) {
            query = query.eq('sku', sku);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[StockSnapshots] Query error:', error.message);
            return [];
        }

        return (data as StockSnapshotRow[]) || [];
    } catch {
        return [];
    }
}
