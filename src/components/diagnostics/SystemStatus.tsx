"use client";

import { useEffect, useState } from "react";
import { runSystemDiagnostics, DiagnosticsResult } from "@/app/actions-status";
import { motion, AnimatePresence } from "framer-motion";
import {
    Activity,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RefreshCcw,
    Server,
    Clock,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

export function SystemStatus() {
    const [results, setResults] = useState<DiagnosticsResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const runTests = async () => {
        setLoading(true);
        setResults([]);
        try {
            const data = await runSystemDiagnostics();
            setResults(data);
        } catch (error) {
            console.error("Diagnostics failed", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runTests();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "operational": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
            case "degraded": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
            case "down": return "text-rose-400 bg-rose-400/10 border-rose-400/20";
            default: return "text-slate-400 bg-slate-400/10 border-slate-400/20";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "operational": return <CheckCircle2 size={18} />;
            case "degraded": return <AlertTriangle size={18} />;
            case "down": return <XCircle size={18} />;
            default: return <Activity size={18} />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-indigo-400" />
                        Status do Sistema
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Diagnóstico em tempo real das integrações e APIs
                    </p>
                </div>
                <button
                    onClick={runTests}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/50 text-white rounded-lg transition-all text-sm font-medium shadow-lg shadow-indigo-900/20"
                >
                    <RefreshCcw size={16} className={cn(loading && "animate-spin")} />
                    {loading ? "Executando testes..." : "Rodar Diagnóstico"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                    {loading && results.length === 0 ? (
                        // Skeletal Loading State
                        [1, 2, 3, 4].map((i) => (
                            <motion.div
                                key={`skeleton-${i}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 h-32 animate-pulse space-y-3"
                            >
                                <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                                <div className="h-8 bg-slate-800 rounded w-full"></div>
                            </motion.div>
                        ))
                    ) : (
                        results.map((result, index) => (
                            <motion.div
                                key={result.service}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "group relative overflow-hidden rounded-xl border bg-slate-900/40 backdrop-blur-md p-6 transition-all hover:bg-slate-800/40",
                                    getStatusColor(result.status).split(" ")[2] // Apply border color
                                )}
                            >
                                {/* Background Glow Effect on Hover */}
                                <div className={cn(
                                    "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br",
                                    result.status === "operational" ? "from-emerald-500 to-transparent" :
                                        result.status === "degraded" ? "from-amber-500 to-transparent" :
                                            "from-rose-500 to-transparent"
                                )} />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg flex items-center justify-center aspect-square",
                                                getStatusColor(result.status)
                                            )}>
                                                {getStatusIcon(result.status)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-lg">{result.service}</h3>
                                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                                    <Clock size={12} />
                                                    {result.latency}ms
                                                    <span className="w-1 h-1 bg-slate-600 rounded-full mx-1" />
                                                    {new Date(result.lastChecked).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border",
                                            getStatusColor(result.status)
                                        )}>
                                            {result.status}
                                        </div>
                                    </div>

                                    <p className="text-slate-300 text-sm bg-slate-950/30 p-3 rounded-lg border border-white/5">
                                        {result.message}
                                    </p>

                                    {/* Detailed JSON View */}
                                    {result.details && (
                                        <div className="mt-4">
                                            <button
                                                onClick={() => setExpandedId(expandedId === result.service ? null : result.service)}
                                                className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-2 rounded-lg hover:bg-indigo-500/20 w-full justify-between"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Server size={12} />
                                                    Ver Detalhes Técnicos
                                                </span>
                                                <ChevronDown
                                                    size={14}
                                                    className={cn("transition-transform", expandedId === result.service ? "rotate-180" : "")}
                                                />
                                            </button>

                                            <AnimatePresence>
                                                {expandedId === result.service && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <pre className="mt-2 p-3 bg-black/50 rounded-lg text-xs text-emerald-500 font-mono overflow-x-auto border border-emerald-900/30 shadow-inner">
                                                            {JSON.stringify(result.details, null, 2)}
                                                        </pre>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
