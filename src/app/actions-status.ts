"use server";

import { getGoogleAnalyticsData } from "@/lib/services/google";
import { getTinyOrders } from "@/lib/services/tiny";
import { getMetaAdsInsights } from "@/lib/services/meta";
import { getWakeProducts } from "@/lib/services/wake";

export type ServiceStatus = "operational" | "degraded" | "down" | "maintenance";

export interface DiagnosticsResult {
    service: string;
    status: ServiceStatus;
    latency: number;
    message?: string;
    details?: any;
    lastChecked: string;
}

export async function runSystemDiagnostics(): Promise<DiagnosticsResult[]> {
    const results: DiagnosticsResult[] = [];

    // Date range for testing (last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - 30);
    const startDate = startDateObj.toISOString().split('T')[0];

    // 0. Check Environment Variables
    const requiredVars = [
        "GA4_PROPERTY_ID",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_REFRESH_TOKEN",
        "TINY_API_TOKEN"
    ];

    const missingVars = requiredVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
        results.push({
            service: "Environment Variables",
            status: "down",
            latency: 0,
            message: `Variáveis faltando: ${missingVars.join(", ")}`,
            details: { missing: missingVars },
            lastChecked: new Date().toISOString()
        });
    } else {
        results.push({
            service: "Environment Variables",
            status: "operational",
            latency: 0,
            message: "Todas as variáveis de ambiente críticas estão configuradas.",
            details: { checked: requiredVars },
            lastChecked: new Date().toISOString()
        });
    }

    // 1. Check Google Analytics 4
    const gaStart = Date.now();
    try {
        const gaData = await getGoogleAnalyticsData(startDate, endDate);
        const gaLatency = Date.now() - gaStart;

        if (gaData && !gaData.error) {
            results.push({
                service: "Google Analytics 4",
                status: gaData.sessions === 0 ? "degraded" : "operational",
                latency: gaLatency,
                message: gaData.sessions === 0 ? "Conectado, mas retornando 0 sessões." : `Conectado via API. ${gaData.sessions} sessões recuperadas.`,
                details: gaData,
                lastChecked: new Date().toISOString()
            });
        } else {
            results.push({
                service: "Google Analytics 4",
                status: "down",
                latency: gaLatency,
                message: gaData?.error || "Falha na conexão",
                details: gaData,
                lastChecked: new Date().toISOString()
            });
        }
    } catch (e: any) {
        results.push({
            service: "Google Analytics 4",
            status: "down",
            latency: Date.now() - gaStart,
            message: e.message || "Erro desconhecido",
            lastChecked: new Date().toISOString()
        });
    }

    // 2. Check Tiny ERP
    const tinyStart = Date.now();
    try {
        const tinyData = await getTinyOrders(startDate, endDate);
        const tinyLatency = Date.now() - tinyStart;

        results.push({
            service: "Tiny ERP",
            status: Array.isArray(tinyData) && tinyData.length > 0 ? "operational" : "degraded",
            latency: tinyLatency,
            message: Array.isArray(tinyData) ? `${tinyData.length} pedidos encontrados.` : "Nenhum pedido retornado ou erro.",
            details: { count: tinyData?.length },
            lastChecked: new Date().toISOString()
        });
    } catch (e: any) {
        results.push({
            service: "Tiny ERP",
            status: "down",
            latency: Date.now() - tinyStart,
            message: e.message,
            lastChecked: new Date().toISOString()
        });
    }

    // 3. Check Meta Ads
    const metaStart = Date.now();
    try {
        const metaData = await getMetaAdsInsights(startDate, endDate);
        const metaLatency = Date.now() - metaStart;

        if (metaData && !metaData.error) {
            results.push({
                service: "Meta Ads (Facebook)",
                status: "operational",
                latency: metaLatency,
                message: `Conectado. Investimento processado: R$ ${metaData.spend}`,
                details: metaData,
                lastChecked: new Date().toISOString()
            });
        } else {
            results.push({
                service: "Meta Ads (Facebook)",
                status: "down",
                latency: metaLatency,
                message: metaData?.error || "Erro de conexão",
                lastChecked: new Date().toISOString()
            });
        }
    } catch (e: any) {
        results.push({
            service: "Meta Ads (Facebook)",
            status: "down",
            latency: Date.now() - metaStart,
            message: e.message,
            lastChecked: new Date().toISOString()
        });
    }

    // 4. Check Wake Commerce
    const wakeStart = Date.now();
    try {
        const wakeData = await getWakeProducts();
        const wakeLatency = Date.now() - wakeStart;

        if (wakeData && !wakeData.error) {
            const count = Array.isArray(wakeData) ? wakeData.length : (wakeData.result?.length || 0);
            results.push({
                service: "Wake Commerce",
                status: "operational",
                latency: wakeLatency,
                message: `API respondendo. ${count} produtos listados.`,
                details: { productCount: count },
                lastChecked: new Date().toISOString()
            });
        } else {
            results.push({
                service: "Wake Commerce",
                status: "down",
                latency: wakeLatency,
                message: wakeData?.error || "Erro ao conectar",
                lastChecked: new Date().toISOString()
            });
        }
    } catch (e: any) {
        results.push({
            service: "Wake Commerce",
            status: "down",
            latency: Date.now() - wakeStart,
            message: e.message,
            lastChecked: new Date().toISOString()
        });
    }

    return results;
}
