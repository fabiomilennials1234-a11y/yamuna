"use server";

import { getTinyOrderDetail } from './tiny';
import { cacheOrders, CachedOrder } from './customer-cache';

/**
 * Enrich Tiny orders with customer data in batches
 * Uses intelligent batching to avoid timeouts
 */
export async function enrichTinyOrdersBatch(
    orderIds: string[],
    maxBatch: number = 50 // Process max 50 at a time to avoid timeout
): Promise<CachedOrder[]> {

    console.log(`[Enrich] 🔄 Enriching ${orderIds.length} Tiny orders (max ${maxBatch} per batch)`);

    const enrichedOrders: CachedOrder[] = [];
    const batchSize = Math.min(maxBatch, orderIds.length);

    // Process in batches
    for (let i = 0; i < orderIds.length; i += batchSize) {
        const batch = orderIds.slice(i, i + batchSize);
        console.log(`[Enrich] 📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} orders)`);

        // Fetch details for this batch in parallel (but limit concurrency)
        const batchPromises = batch.map(async (orderId) => {
            try {
                const details = await getTinyOrderDetail(orderId);

                if (details) {
                    return {
                        order_id: orderId,
                        order_date: details.date || '',
                        customer_email: details.customerEmail || null,
                        customer_name: details.customerName || null,
                        customer_id: details.customerId || null,
                        order_total: details.total || 0,
                        source: 'tiny' as const
                    };
                }
            } catch (error) {
                console.error(`[Enrich] ❌ Failed to enrich order ${orderId}:`, error);
            }
            return null;
        });

        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(r => r !== null) as CachedOrder[];

        enrichedOrders.push(...validResults);

        // Cache this batch immediately
        if (validResults.length > 0) {
            await cacheOrders(validResults);
        }

        console.log(`[Enrich] ✅ Batch complete: ${validResults.length}/${batch.length} successful`);
    }

    console.log(`[Enrich] ✅ Total enriched: ${enrichedOrders.length}/${orderIds.length}`);
    return enrichedOrders;
}

/**
 * Smart enrichment strategy:
 * 1. Try cache first
 * 2. Enrich only missing orders
 * 3. Use Wake data when available
 */
export async function getEnrichedOrders(
    tinyOrders: any[],
    wakeOrders: any[],
    maxEnrich: number = 100 // Max orders to enrich from Tiny
): Promise<{
    enriched: CachedOrder[];
    fromCache: number;
    fromWake: number;
    fromTinyEnriched: number;
    unenriched: number;
}> {

    const stats = {
        fromCache: 0,
        fromWake: 0,
        fromTinyEnriched: 0,
        unenriched: 0
    };

    const enrichedOrders: CachedOrder[] = [];

    // 1. Add Wake orders (already have customer data)
    wakeOrders.forEach(order => {
        if (order.customerEmail) {
            enrichedOrders.push({
                order_id: order.id,
                order_date: order.date,
                customer_email: order.customerEmail,
                customer_name: order.customerName || null,
                customer_id: order.customerId || null,
                order_total: order.total || 0,
                source: 'wake'
            });
            stats.fromWake++;
        }
    });

    // Cache Wake orders for future use
    if (enrichedOrders.length > 0) {
        await cacheOrders(enrichedOrders);
    }

    // 2. For Tiny orders, try to enrich most recent ones
    const tinyOrdersToEnrich = tinyOrders
        .slice(0, maxEnrich) // Only enrich most recent N orders
        .map(o => o.id);

    if (tinyOrdersToEnrich.length > 0) {
        const tinyEnriched = await enrichTinyOrdersBatch(tinyOrdersToEnrich, 25);
        enrichedOrders.push(...tinyEnriched);
        stats.fromTinyEnriched = tinyEnriched.length;
    }

    stats.unenriched = tinyOrders.length - stats.fromTinyEnriched;

    console.log(`[Enrich] 📊 Summary:`, stats);

    return {
        enriched: enrichedOrders,
        ...stats
    };
}



