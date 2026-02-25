/**
 * Cache Service for Dashboard Yamuna
 * Uses Upstash Redis in production, in-memory cache for development
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client if credentials are available
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// Fallback in-memory cache for development
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}
const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * Get or set cached data with TTL
 * Uses Redis if available, falls back to memory cache
 */
export async function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
): Promise<T> {
    // Try Redis first
    if (redis) {
        try {
            const cached = await redis.get<T>(key);
            if (cached !== null && cached !== undefined) {
                console.log(`[Cache] ✅ REDIS HIT: ${key}`);
                return cached;
            }

            // Cache miss - fetch data
            console.log(`[Cache] ❌ REDIS MISS: ${key}`);
            const data = await fetcher();

            // Store in Redis with TTL
            await redis.setex(key, ttlSeconds, JSON.stringify(data));

            return data;
        } catch (error) {
            console.error(`[Cache] ⚠️ Redis error, falling back to memory:`, error);
            // Fall through to memory cache
        }
    }

    // Memory cache fallback
    const now = Date.now();
    const cached = memoryCache.get(key);
    if (cached && cached.expiresAt > now) {
        console.log(`[Cache] ✅ MEMORY HIT: ${key}`);
        return cached.data as T;
    }

    console.log(`[Cache] ❌ MEMORY MISS: ${key}`);
    const data = await fetcher();

    memoryCache.set(key, {
        data,
        expiresAt: now + (ttlSeconds * 1000)
    });

    return data;
}

/**
 * Invalidate cache by key or pattern
 * If no key/pattern provided, clears ALL cache
 */
export async function invalidateCache(keyOrPattern?: string): Promise<void> {
    // Clear all cache if no pattern
    if (!keyOrPattern) {
        // Clear memory cache
        memoryCache.clear();
        console.log(`[Cache] 🗑️ Cleared all memory cache`);

        // Clear Redis cache - get all keys and delete
        if (redis) {
            try {
                // Use scan to get all keys and delete them
                let cursor = 0;
                do {
                    const scanResult: any = await redis.scan(cursor, { count: 100 }); const nextCursor = scanResult[0] || 0; const keys = scanResult[1] || [];
                    cursor = nextCursor;
                    if (keys.length > 0) {
                        await redis.del(...keys);
                        console.log(`[Cache] 🗑️ Redis deleted ${keys.length} keys`);
                    }
                } while (cursor !== 0);
                console.log(`[Cache] 🗑️ Cleared all Redis cache`);
            } catch (error) {
                console.error(`[Cache] Error clearing all Redis cache:`, error);
            }
        }
        return;
    }

    // Redis invalidation for specific key
    if (redis && keyOrPattern) {
        try {
            // For pattern matching, we'd need to scan keys
            // For now, just delete exact key
            await redis.del(keyOrPattern);
            console.log(`[Cache] 🗑️ Redis invalidated: ${keyOrPattern}`);
        } catch (error) {
            console.error(`[Cache] Error invalidating Redis:`, error);
        }
    }

    // Memory cache invalidation
    for (const key of memoryCache.keys()) {
        if (key.includes(keyOrPattern)) {
            memoryCache.delete(key);
            console.log(`[Cache] 🗑️ Memory invalidated: ${key}`);
        }
    }
}

/**
 * Get cache stats
 */
export function getCacheStats(): {
    type: 'redis' | 'memory';
    memorySize: number;
    memoryKeys: string[]
} {
    return {
        type: redis ? 'redis' : 'memory',
        memorySize: memoryCache.size,
        memoryKeys: Array.from(memoryCache.keys())
    };
}

/**
 * Check if Redis is connected
 */
export function isRedisEnabled(): boolean {
    return !!redis;
}

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
    SHORT: 60,          // 1 minute - for very dynamic data
    MEDIUM: 300,        // 5 minutes - default
    LONG: 900,          // 15 minutes - for semi-static data
    HOUR: 3600,         // 1 hour - for historical/12-month data
    FOUR_HOURS: 14400,  // 4 hours - for very historical data (365 days)
    DAY: 86400          // 24 hours - for static data
} as const;

