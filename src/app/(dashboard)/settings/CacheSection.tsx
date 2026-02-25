"use client";

import { useState } from "react";
import { RefreshCw, Trash2, Database, CheckCircle } from "lucide-react";
import { clearAllCaches, clearDashboardCache, getCacheStatus } from "@/app/cache-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CacheSection() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("idle");

    async function handleClearAll() {
        setLoading(true);
        setStatus("clearing");
        try {
            const result = await clearAllCaches();
            setMessage(result.message);
            setStatus("success");

            // Auto-reload after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error: any) {
            setMessage("Erro ao limpar cache: " + (error.message || "Erro desconhecido"));
            setStatus("error");
        } finally {
            setLoading(false);
        }
    }

    async function handleClearDashboard() {
        setLoading(true);
        setStatus("clearing");
        try {
            const result = await clearDashboardCache();
            setMessage(result.message);
            setStatus("success");

            // Auto-reload after 1 second
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error: any) {
            setMessage("Erro ao limpar cache: " + (error.message || "Erro desconhecido"));
            setStatus("error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                    <Database size={20} />
                </div>
                <CardTitle>Cache & Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                    Se os dados do dashboard parecerem incorretos ou desatualizados,
                    limpe o cache para forçar uma nova busca das APIs.
                </p>

                {/* Message */}
                {message && (
                    <div
                        className={`p-4 rounded-lg text-sm flex items-center gap-2 ${status === "success"
                                ? "bg-emerald-500/10 border border-emerald-500/50 text-emerald-400"
                                : status === "error"
                                    ? "bg-red-500/10 border border-red-500/50 text-red-400"
                                    : "bg-muted text-muted-foreground"
                            }`}
                    >
                        {status === "success" && <CheckCircle size={18} />}
                        {message}
                        {status === "success" && (
                            <span className="text-xs opacity-75 ml-2">Recarregando...</span>
                        )}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex flex-wrap gap-3">
                    <Button
                        onClick={handleClearDashboard}
                        disabled={loading}
                        variant="default"
                        className="gap-2"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        {loading ? "Limpando..." : "Limpar Cache Dashboard"}
                    </Button>

                    <Button
                        onClick={handleClearAll}
                        disabled={loading}
                        variant="destructive"
                        className="gap-2"
                    >
                        <Trash2 size={16} />
                        {loading ? "Limpando..." : "Limpar TODO Cache"}
                    </Button>
                </div>

                {/* Info */}
                <div className="text-xs text-muted-foreground space-y-1">
                    <p>• <strong>Cache Dashboard:</strong> Limpa dados de métricas e KPIs</p>
                    <p>• <strong>Todo Cache:</strong> Limpa todos os dados em cache (RFM, Funil, APIs)</p>
                    <p>• Os dados serão buscados novamente das APIs após limpar</p>
                </div>
            </CardContent>
        </Card>
    );
}
