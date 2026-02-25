import { NextResponse } from "next/server";
import { fetchDashboardData } from "@/app/actions";
import { fetchFunnelData } from "@/app/funnel-actions";
import { fetchOmniProductsData } from "@/app/products-actions";
import { fetchRFMData } from "@/app/rfm-actions";
import { format, subDays } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET() {
    const endDate = format(new Date(), "yyyy-MM-dd");
    const startDate = format(subDays(new Date(), 30), "yyyy-MM-dd");

    console.log(`[WarmCache] 🔥 Iniciando aquecimento de cache: ${startDate} → ${endDate}`);

    // Inicia busca em background sem bloquear a resposta
    (async () => {
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
        console.log(`[WarmCache] ✅ Concluído em ${elapsed}s — ${ok} ok, ${fail} falhas`);
    })();

    return NextResponse.json({
        status: 'warming',
        message: 'Cache aquecendo em background',
        period: { startDate, endDate },
    });
}
