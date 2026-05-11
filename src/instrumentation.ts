/**
 * Next.js Instrumentation
 *
 * Roda automaticamente quando o servidor inicia.
 * Aquece o cache em background e agenda refresh a cada 1 hora.
 * Warm-up real está em instrumentation-warmup.ts (Node only) para não quebrar o Edge.
 */

const MAIN_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
const RFM_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 horas
const STARTUP_DELAY_MS = 10 * 1000; // 10s
const RFM_DELAY_MS = 5 * 60 * 1000; // 5min

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  console.log(
    "[Instrumentation] 🚀 Servidor iniciado — warm-up principal em 10s, RFM em 5min"
  );

  // Carrega o warm-up só no Node (evita Edge bundling de funnel-actions/goals-local/cache)
  const warmup = await import("./instrumentation-warmup");

  setTimeout(() => {
    warmup.runMainWarmup();
    setInterval(warmup.runMainWarmup, MAIN_INTERVAL_MS);
  }, STARTUP_DELAY_MS);

  setTimeout(() => {
    warmup.runRFMWarmup();
    setInterval(warmup.runRFMWarmup, RFM_INTERVAL_MS);
  }, RFM_DELAY_MS);
}
