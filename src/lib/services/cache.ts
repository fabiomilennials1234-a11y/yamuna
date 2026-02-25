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

interface SupabaseCacheResult<T> {
    data: T;
    isStale: boolean;
}

/**
 * Lê do Supabase metrics_snapshots.
 * SEMPRE retorna dados se existirem — mesmo que expirados (stale).
 * O campo isStale sinaliza que o dado precisa ser renovado em background.
 */
async function getFromSupabase<T>(key: string): Promise<SupabaseCacheResult<T> | null> {
    if (!supabaseCache) return null;
    try {
        const { data, error } = await supabaseCache
            .from('metrics_snapshots')
            .select('data, expires_at')
            .eq('cache_key', key)
            .single();

        if (error || !data) return null;

        const isStale = new Date(data.expires_at) <= new Date();
        return { data: data.data as T, isStale };
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

// Controla quais chaves já têm refresh em background ativo (evita duplicatas)
const backgroundRefreshInProgress = new Set<string>();

/**
 * Get or set cached data com estratégia Stale-While-Revalidate.
 *
 * Hierarquia:
 * 1. Memory  → retorna imediatamente se fresco
 * 2. Redis   → retorna imediatamente se configurado e com hit
 * 3. Supabase → retorna SEMPRE se existir (mesmo stale) + dispara refresh em background
 * 4. API     → apenas se nenhum tier tem dado algum (cold start)
 *
 * O usuário NUNCA espera por dados stale — recebe o dado antigo na hora
 * e o background atualiza para a próxima requisição.
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
                memoryCache.set(key, { data: cached, expiresAt: now + (ttlSeconds * 1000) });
                return cached;
            }
        } catch (error) {
            console.error(`[Cache] ⚠️ Redis error:`, error);
        }
    }

    // ── Tier 3: Supabase — Stale-While-Revalidate ──────────────────────────
    const supabaseResult = await getFromSupabase<T>(key);
    if (supabaseResult !== null) {
        const { data: cachedData, isStale } = supabaseResult;

        if (isStale && !backgroundRefreshInProgress.has(key)) {
            // Dado existe mas expirou → retorna agora, renova em background
            console.log(`[Cache] ♻️  SUPABASE STALE (background refresh): ${key}`);
            backgroundRefreshInProgress.add(key);
            setImmediate(() => {
                fetcher()
                    .then(fresh => Promise.all([
                        setInSupabase(key, fresh, ttlSeconds),
                        Promise.resolve(memoryCache.set(key, { data: fresh, expiresAt: Date.now() + ttlSeconds * 1000 })),
                    ]))
                    .catch(() => {})
                    .finally(() => backgroundRefreshInProgress.delete(key));
            });
        } else if (!isStale) {
            console.log(`[Cache] ✅ SUPABASE HIT: ${key}`);
        }

        // Repopula memória para próxima leitura ser instantânea
        memoryCache.set(key, { data: cachedData, expiresAt: now + (ttlSeconds * 1000) });
        return cachedData;
    }

    // ── Tier 4: API fetch (lento — apenas cold start / primeiro boot) ───────
    console.log(`[Cache] ❌ COLD START: ${key}`);
    const data = await fetcher();

    // Persiste em todos os tiers (fire-and-forget — não bloqueia o retorno)
    memoryCache.set(key, { data, expiresAt: now + (ttlSeconds * 1000) });
    const persist: Promise<unknown>[] = [setInSupabase(key, data, ttlSeconds)];
    if (redis) {
        persist.push(redis.setex(key, ttlSeconds, JSON.stringify(data)).catch(() => {}));
    }
    Promise.all(persist).catch(() => {});

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

