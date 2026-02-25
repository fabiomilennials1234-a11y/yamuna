/**
 * Next.js Instrumentation
 *
 * Roda automaticamente quando o servidor inicia.
 * Aquece o cache em background e agenda refresh a cada 1 hora.
 * Os usuários sempre encontram os dados prontos, sem espera.
 */

const WARM_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
const STARTUP_DELAY_MS = 15 * 1000;       // 15s após o boot para o servidor estabilizar

export async function register() {
    // Apenas no runtime Node.js (não no Edge runtime)
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    console.log('[Instrumentation] 🚀 Servidor iniciado — warm-up de cache agendado em 15s');

    setTimeout(() => {
        // Primeira execução imediata
        runWarmup();

        // Refresh automático a cada hora
        setInterval(runWarmup, WARM_INTERVAL_MS);
    }, STARTUP_DELAY_MS);
}

async function runWarmup() {
    try {
        const { format, subDays } = await import('date-fns');
        const { fetchDashboardData } = await import('@/app/actions');
        const { fetchFunnelData } = await import('@/app/funnel-actions');
        const { fetchOmniProductsData } = await import('@/app/products-actions');
        const { fetchRFMData } = await import('@/app/rfm-actions');

        const endDate = format(new Date(), 'yyyy-MM-dd');
        const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

        console.log(`[WarmCache] 🔥 Iniciando warm-up: ${startDate} → ${endDate}`);
        const t0 = Date.now();

        const results = await Promise.allSettled([
            fetchDashboardData(startDate, endDate),
            fetchFunnelData(startDate, endDate),
            fetchOmniProductsData(startDate, endDate, 20),
            fetchRFMData(6),
        ]);

        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        const ok = results.filter(r => r.status === 'fulfilled').length;
        const fail = results.filter(r => r.status === 'rejected').length;

        console.log(`[WarmCache] ✅ Cache aquecido em ${elapsed}s — ${ok}/4 ok${fail > 0 ? `, ${fail} falha(s)` : ''}`);
    } catch (e) {
        console.error('[WarmCache] ❌ Erro no warm-up automático:', e);
    }
}
