/**
 * Warm-up de cache — carregado apenas no Node (não no Edge).
 * Chamado dinamicamente por instrumentation.ts para evitar bundling no Edge.
 */

const GAP_BETWEEN_STEPS_MS = 5 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runMainWarmup() {
  try {
    const { format, startOfMonth } = await import("date-fns");
    const { fetchDashboardData } = await import("@/app/actions");
    const { fetchFunnelData } = await import("@/app/funnel-actions");
    const { fetchOmniProductsData } = await import("@/app/products-actions");
    const { saveStockSnapshotsFromOverview } = await import("@/app/stock-actions");

    const endDate = format(new Date(), "yyyy-MM-dd");
    const startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");

    console.log(`[WarmCache] 🔥 Warm-up principal: ${startDate} → ${endDate}`);
    const t0 = Date.now();

    const steps = [
      { name: "Dashboard", fn: () => fetchDashboardData(startDate, endDate) },
      { name: "Funil", fn: () => fetchFunnelData(startDate, endDate) },
      {
        name: "Produtos",
        fn: () => fetchOmniProductsData(startDate, endDate, 20),
      },
      {
        name: "Stock Snapshots",
        fn: () => saveStockSnapshotsFromOverview(),
      },
    ];

    let ok = 0;
    let fail = 0;
    for (const step of steps) {
      try {
        const t1 = Date.now();
        await step.fn();
        console.log(
          `[WarmCache] ✓ ${step.name}: ${((Date.now() - t1) / 1000).toFixed(1)}s`
        );
        ok++;
      } catch (err) {
        console.warn(`[WarmCache] ⚠️ Falha em ${step.name}:`, err);
        fail++;
      }
      await sleep(GAP_BETWEEN_STEPS_MS);
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `[WarmCache] ✅ Principal concluído em ${elapsed}s — ${ok}/${steps.length} ok${fail > 0 ? `, ${fail} falha(s)` : ""}`
    );
  } catch (e) {
    console.error("[WarmCache] ❌ Erro no warm-up principal:", e);
  }
}

export async function runRFMWarmup() {
  try {
    const { fetchRFMData } = await import("@/app/rfm-actions");

    console.log(`[WarmCache] 🔥 Warm-up RFM (6 meses)...`);
    const t0 = Date.now();

    await fetchRFMData(6);

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[WarmCache] ✅ RFM concluído em ${elapsed}s`);
  } catch (e) {
    console.error("[WarmCache] ❌ Erro no warm-up RFM:", e);
  }
}
