"use server";

import { invalidateCache, getCacheStats } from "@/lib/services/cache";
import { revalidatePath } from "next/cache";

/**
 * Server action to clear all caches and force fresh data
 */
export async function clearAllCaches() {
    console.log("[CacheClear] 🧹 Starting full cache clear...");

    // Clear our custom cache (Redis + Memory)
    await invalidateCache();

    // Revalidate Next.js cache for all dashboard pages
    revalidatePath("/");
    revalidatePath("/(dashboard)");
    revalidatePath("/(dashboard)/finance");
    revalidatePath("/(dashboard)/funnel");
    revalidatePath("/(dashboard)/rfm");
    revalidatePath("/(dashboard)/meta-ads");
    revalidatePath("/(dashboard)/google-ads");
    revalidatePath("/(dashboard)/products");
    revalidatePath("/(dashboard)/publico-alvo");
    revalidatePath("/(dashboard)/origem-midia");
    revalidatePath("/(dashboard)/settings");

    console.log("[CacheClear] ✅ All caches cleared!");

    return {
        success: true,
        message: "Todos os caches foram limpos! Recarregue a página para ver os dados atualizados.",
        stats: getCacheStats(),
        timestamp: new Date().toISOString()
    };
}

/**
 * Server action to clear specific cache types
 */
export async function clearDashboardCache() {
    console.log("[CacheClear] 🧹 Clearing dashboard caches...");

    await invalidateCache("dashboard:");
    await invalidateCache("metrics:");

    revalidatePath("/");
    revalidatePath("/(dashboard)");

    return {
        success: true,
        message: "Cache do dashboard limpo!",
        timestamp: new Date().toISOString()
    };
}

/**
 * Server action to clear funnel-related caches
 */
export async function clearFunnelCache() {
    console.log("[CacheClear] 🧹 Clearing funnel caches...");

    await invalidateCache("funnel:");

    revalidatePath("/(dashboard)/funnel");

    return {
        success: true,
        message: "Cache do funil limpo!",
        timestamp: new Date().toISOString()
    };
}

/**
 * Get current cache status
 */
export async function getCacheStatus() {
    const stats = getCacheStats();
    return {
        ...stats,
        timestamp: new Date().toISOString()
    };
}
