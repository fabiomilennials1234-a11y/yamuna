/**
 * Cache Service for Dashboard Yamuna
 *
 * Hierarquia de cache (do mais rápido ao mais lento):
 * 1. Memory (Map)  — processo local, perde ao reiniciar, ~0ms
 * 2. Supabase      — persistente entre restarts, ~50-200ms
 * 3. Redis         — se configurado via Upstash, ~20-50ms
 * 4. API fetch     — lento (Tiny até minutos), último recurso
 */

import { Redis } from '@upstash/redis';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Initialize Redis client if credentials are available
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// Supabase client para cache persistente (sem cookies — opera em background)
const supabaseCache = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
    )
    : null;

// Fallback in-memory cache for development
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}
const memoryCache = new Map<string, CacheEntry<any>>();

/** Lê do Supabase metrics_snapshots; retorna null se não encontrado ou expirado */
async function getFromSupabase<T>(key: string): Promise<T | null> {
    if (!supabaseCache) return null;
    try {
        const { data, error } = await supabaseCache
            .from('metrics_snapshots')
            .select('data, expires_at')
            .eq('cache_key', key)
            .single();

        if (error || !data) return null;
        if (new Date(data.expires_at) <= new Date()) return null; // expirado

        return data.data as T;
    } catch {
        return null;
    }
}

/** Grava no Supabase metrics_snapshots com upsert */
async function setInSupabase(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!supabaseCache) return;
    try {
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
        await supabaseCache
            .from('metrics_snapshots')
            .upsert(
                { cache_key: key, data: value, expires_at: expiresAt },
                { onConflict: 'cache_key' }
            );
    } catch {
        // Silencia erros de escrita — cache é best-effort
    }
}

/**
 * Get or set cached data with TTL
 * Tiers: Memory → Supabase → Redis → Fetcher (API)
 */
export async function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
): Promise<T> {
    const now = Date.now();

    // ── Tier 1: Memory cache (mais rápido, local ao processo) ──────────────
    const memEntry = memoryCache.get(key);
    if (memEntry && memEntry.expiresAt > now) {
        console.log(`[Cache] ✅ MEM HIT: ${key}`);
        return memEntry.data as T;
    }

    // ── Tier 2: Redis (se configurado) ─────────────────────────────────────
    if (redis) {
        try {
            const cached = await redis.get<T>(key);
            if (cached !== null && cached !== undefined) {
                console.log(`[Cache] ✅ REDIS HIT: ${key}`);
                // Repopula memória para próxima leitura
                memoryCache.set(key, { data: cached, expiresAt: now + (ttlSeconds * 1000) });
                return cached;
            }
        } catch (error) {
            console.error(`[Cache] ⚠️ Redis error:`, error);
        }
    }

    // ── Tier 3: Supabase (persistente entre restarts) ──────────────────────
    const supabaseCached = await getFromSupabase<T>(key);
    if (supabaseCached !== null) {
        console.log(`[Cache] ✅ SUPABASE HIT: ${key}`);
        // Repopula memória para próxima leitura
        memoryCache.set(key, { data: supabaseCached, expiresAt: now + (ttlSeconds * 1000) });
        return supabaseCached;
    }

    // ── Tier 4: API fetch (lento — último recurso) ─────────────────────────
    console.log(`[Cache] ❌ MISS (todos os tiers): ${key}`);
    const data = await fetcher();

    // Salva em todos os tiers em paralelo (não bloqueia o retorno)
    const storagePromises: Promise<unknown>[] = [
        Promise.resolve(memoryCache.set(key, { data, expiresAt: now + (ttlSeconds * 1000) })),
        setInSupabase(key, data, ttlSeconds),
    ];
    if (redis) {
        storagePromises.push(
            redis.setex(key, ttlSeconds, JSON.stringify(data)).catch((e) =>
                console.error(`[Cache] ⚠️ Redis write error:`, e)
            )
        );
    }
    // Fire-and-forget: não espera as escritas terminarem
    Promise.all(storagePromises).catch(() => {});

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

