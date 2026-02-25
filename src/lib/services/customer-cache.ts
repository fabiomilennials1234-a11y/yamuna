"use server";

import { createClient } from '@/lib/supabase/server';

export interface CachedOrder {
    order_id: string;
    order_date: string;
    customer_email?: string;
    customer_name?: string;
    customer_id?: string;
    order_total: number;
    source: 'tiny' | 'wake';
}

/**
 * Get cached orders for a date range
 */
export async function getCachedOrders(startDate: string, endDate: string): Promise<CachedOrder[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('customer_orders_cache')
        .select('*')
        .gte('order_date', startDate)
        .lte('order_date', endDate)
        .order('order_date', { ascending: false });

    if (error) {
        console.error('[Cache] Error fetching cached orders:', error);
        return [];
    }

    return data || [];
}

/**
 * Cache multiple orders at once
 */
export async function cacheOrders(orders: CachedOrder[]): Promise<void> {
    if (orders.length === 0) return;

    const supabase = await createClient();

    // Use upsert to handle duplicates
    const { error } = await supabase
        .from('customer_orders_cache')
        .upsert(orders, {
            onConflict: 'order_id',
            ignoreDuplicates: false
        });

    if (error) {
        console.error('[Cache] Error caching orders:', error);
    } else {
        console.log(`[Cache] ✅ Cached ${orders.length} orders`);
    }
}

/**
 * Get orders that are NOT in cache (need enrichment)
 */
export async function getUncachedOrderIds(orderIds: string[]): Promise<string[]> {
    if (orderIds.length === 0) return [];

    const supabase = await createClient();

    const { data, error } = await supabase
        .from('customer_orders_cache')
        .select('order_id')
        .in('order_id', orderIds);

    if (error) {
        console.error('[Cache] Error checking cached IDs:', error);
        return orderIds; // Return all as uncached on error
    }

    const cachedIds = new Set((data || []).map(d => d.order_id));
    return orderIds.filter(id => !cachedIds.has(id));
}

/**
 * Check cache coverage for a date range
 */
export async function getCacheCoverage(startDate: string, endDate: string): Promise<{
    totalOrders: number;
    cachedOrders: number;
    coveragePercent: number;
}> {
    const supabase = await createClient();

    const { count, error } = await supabase
        .from('customer_orders_cache')
        .select('*', { count: 'exact', head: true })
        .gte('order_date', startDate)
        .lte('order_date', endDate);

    if (error) {
        console.error('[Cache] Error checking coverage:', error);
        return { totalOrders: 0, cachedOrders: 0, coveragePercent: 0 };
    }

    return {
        totalOrders: 0, // Will be set by caller
        cachedOrders: count || 0,
        coveragePercent: 0 // Will be calculated by caller
    };
}

/**
 * Clear old cache entries (older than 6 months)
 */
export async function cleanOldCache(): Promise<void> {
    const supabase = await createClient();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { error } = await supabase
        .from('customer_orders_cache')
        .delete()
        .lt('order_date', sixMonthsAgo.toISOString().split('T')[0]);

    if (error) {
        console.error('[Cache] Error cleaning cache:', error);
    } else {
        console.log(`[Cache] 🧹 Cleaned cache entries older than ${sixMonthsAgo.toISOString().split('T')[0]}`);
    }
}
