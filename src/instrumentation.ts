/**
 * Next.js Instrumentation
 *
 * Roda automaticamente quando o servidor inicia.
 * Aquece o cache em background e agenda refresh a cada 1 hora.
 * Os usuários sempre encontram os dados prontos, sem espera.
 *
 * ARQUITETURA:
 * - Warm-up principal (Dashboard, Funil, Produtos): inicia em 10s, repete a cada 1h
 *   → Cobre os dados que os usuários abrem com mais frequência
 *   → Execução SEQUENCIAL para não saturar o tinyLimiter (max 3 slots)
 *   → 5s de pausa entre etapas para liberar slots para usuários
 *
 * - Warm-up RFM (separado): inicia em 5min, repete a cada 4h
 *   → RFM é muito pesado (6 meses de dados, ~90 páginas Tiny)
 *   → Roda DEPOIS que os dados principais já estão no cache
 *   → TTL do RFM é 4h → sincronizado com o intervalo de refresh
 */

const MAIN_INTERVAL_MS  = 60 * 60 * 1000;  // 1 hora
const RFM_INTERVAL_MS   = 4 * 60 * 60 * 1000; // 4 horas
const STARTUP_DELAY_MS  = 10 * 1000;       // 10s — começa logo após o servidor estabilizar
const RFM_DELAY_MS      = 5 * 60 * 1000;  // 5min — RFM começa só após os dados principais estarem prontos
const GAP_BETWEEN_STEPS_MS = 5 * 1000;    // 5s de pausa entre etapas

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function register() {
    // Apenas no runtime Node.js (não no Edge runtime)
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    console.log('[Instrumentation] 🚀 Servidor iniciado — warm-up principal em 10s, RFM em 5min');

    // ── Warm-up principal: Dashboard, Funil, Produtos ─────────────────────
    setTimeout(() => {
        runMainWarmup();
        setInterval(runMainWarmup, MAIN_INTERVAL_MS);
    }, STARTUP_DELAY_MS);

    // ── Warm-up RFM separado (pesado, roda menos frequente) ───────────────
    setTimeout(() => {
        runRFMWarmup();
        setInterval(runRFMWarmup, RFM_INTERVAL_MS);
    }, RFM_DELAY_MS);
}

async function runMainWarmup() {
    try {
        const { format, startOfMonth } = await import('date-fns');
        const { fetchDashboardData } = await import('@/app/actions');
        const { fetchFunnelData } = await import('@/app/funnel-actions');
        const { fetchOmniProductsData } = await import('@/app/products-actions');

        const endDate = format(new Date(), 'yyyy-MM-dd');
        const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd'); // mês atual (padrão do filtro)

        console.log(`[WarmCache] 🔥 Warm-up principal: ${startDate} → ${endDate}`);
        const t0 = Date.now();

        // Sequencial — não satura o tinyLimiter
        const steps = [
            { name: 'Dashboard', fn: () => fetchDashboardData(startDate, endDate) },
            { name: 'Funil',     fn: () => fetchFunnelData(startDate, endDate) },
            { name: 'Produtos',  fn: () => fetchOmniProductsData(startDate, endDate, 20) },
        ];

        let ok = 0;
        let fail = 0;
        for (const step of steps) {
            try {
                const t1 = Date.now();
                await step.fn();
                console.log(`[WarmCache] ✓ ${step.name}: ${((Date.now() - t1) / 1000).toFixed(1)}s`);
                ok++;
            } catch (err) {
                console.warn(`[WarmCache] ⚠️ Falha em ${step.name}:`, err);
                fail++;
            }
            await sleep(GAP_BETWEEN_STEPS_MS);
        }

        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[WarmCache] ✅ Principal concluído em ${elapsed}s — ${ok}/3 ok${fail > 0 ? `, ${fail} falha(s)` : ''}`);
    } catch (e) {
        console.error('[WarmCache] ❌ Erro no warm-up principal:', e);
    }
}

async function runRFMWarmup() {
    try {
        const { fetchRFMData } = await import('@/app/rfm-actions');

        console.log(`[WarmCache] 🔥 Warm-up RFM (6 meses)...`);
        const t0 = Date.now();

        await fetchRFMData(6);

        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[WarmCache] ✅ RFM concluído em ${elapsed}s`);
    } catch (e) {
        console.error('[WarmCache] ❌ Erro no warm-up RFM:', e);
    }
}
