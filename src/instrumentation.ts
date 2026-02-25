/**
 * Next.js Instrumentation
 *
 * Roda automaticamente quando o servidor inicia.
 * Aquece o cache em background e agenda refresh a cada 1 hora.
 * Os usuários sempre encontram os dados prontos, sem espera.
 *
 * IMPORTANTE: O warm-up é SEQUENCIAL (não paralelo) para evitar saturar
 * o tinyLimiter (semáforo de 3 slots) e competir com requisições de usuários.
 * Cada etapa aguarda a anterior terminar + 5s de pausa entre elas.
 */

const WARM_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
const STARTUP_DELAY_MS = 60 * 1000;       // 60s após o boot — dá tempo ao servidor de estabilizar e ao usuário de começar a navegar
const GAP_BETWEEN_STEPS_MS = 5 * 1000;   // 5s de pausa entre etapas para não monopolizar o limiter

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function register() {
    // Apenas no runtime Node.js (não no Edge runtime)
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    console.log('[Instrumentation] 🚀 Servidor iniciado — warm-up de cache agendado em 60s');

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

        console.log(`[WarmCache] 🔥 Iniciando warm-up sequencial: ${startDate} → ${endDate}`);
        const t0 = Date.now();

        // Executa UMA de cada vez — não satura o tinyLimiter com 9+ chamadas simultâneas
        const steps = [
            { name: 'Dashboard',  fn: () => fetchDashboardData(startDate, endDate) },
            { name: 'Funil',      fn: () => fetchFunnelData(startDate, endDate) },
            { name: 'Produtos',   fn: () => fetchOmniProductsData(startDate, endDate, 20) },
            { name: 'RFM',        fn: () => fetchRFMData(6) },
        ];

        let ok = 0;
        let fail = 0;
        for (const step of steps) {
            try {
                const stepT0 = Date.now();
                await step.fn();
                const stepElapsed = ((Date.now() - stepT0) / 1000).toFixed(1);
                console.log(`[WarmCache] ✓ ${step.name} aquecido em ${stepElapsed}s`);
                ok++;
            } catch (err) {
                console.warn(`[WarmCache] ⚠️ Falha em ${step.name}:`, err);
                fail++;
            }
            // Pausa entre etapas para liberar o limiter para requisições de usuários
            await sleep(GAP_BETWEEN_STEPS_MS);
        }

        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[WarmCache] ✅ Cache aquecido em ${elapsed}s — ${ok}/4 ok${fail > 0 ? `, ${fail} falha(s)` : ''}`);
    } catch (e) {
        console.error('[WarmCache] ❌ Erro no warm-up automático:', e);
    }
}
