"use client";

import { ArrowDown } from "lucide-react";

interface FunnelVisualizationProps {
    funnel: {
        sessions: number;
        addToCarts: number;
        checkouts: number;
        transactions: number;
        cartRate: number;
        checkoutRate: number;
        transactionRate: number;
    };
}

export function FunnelVisualization({ funnel }: FunnelVisualizationProps) {
    const stages = [
        {
            label: "Sessões",
            value: funnel.sessions,
            rate: null,
            color: "from-orange-600 to-orange-700"
        },
        {
            label: "Add ao Carrinho",
            value: funnel.addToCarts,
            rate: funnel.cartRate,
            color: "from-orange-600 to-orange-700"
        },
        {
            label: "Checkout Iniciado",
            value: funnel.checkouts,
            rate: funnel.checkoutRate,
            color: "from-orange-600 to-orange-700"
        },
        {
            label: "Transações",
            value: funnel.transactions,
            rate: funnel.transactionRate,
            color: "from-orange-600 to-orange-700"
        }
    ];

    return (
        <div className="bg-[#0B0B1E]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />

            <h3 className="text-xl font-bold text-white mb-8 text-center uppercase tracking-wider">Visualização do Funil</h3>

            <div className="flex flex-col items-center gap-4 max-w-3xl mx-auto relative z-10">
                {stages.map((stage, index) => {
                    const previousStage = index > 0 ? stages[index - 1] : null;
                    const widthPercent = previousStage
                        ? Math.max((stage.value / previousStage.value) * 100, 30)
                        : 100;

                    return (
                        <div key={stage.label} className="w-full group">
                            {/* Funnel Stage Box */}
                            <div
                                className="relative rounded-xl p-5 shadow-[0_0_15px_rgba(249,115,22,0.1)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(249,115,22,0.2)]"
                                style={{
                                    width: `${widthPercent}%`,
                                    marginLeft: 'auto',
                                    marginRight: 'auto',
                                    background: 'linear-gradient(90deg, rgba(249,115,22,0.8) 0%, rgba(234,179,8,0.8) 100%)',
                                    backdropFilter: 'blur(8px)'
                                }}
                            >
                                <div className="text-center relative z-10">
                                    <p className="text-black/70 font-bold text-xs uppercase tracking-widest mb-1">{stage.label}</p>
                                    <p className="text-white font-extrabold text-2xl drop-shadow-md">
                                        {stage.value.toLocaleString('pt-BR')}
                                    </p>
                                </div>

                                {/* Conversion Rate Badge */}
                                {stage.rate !== null && (
                                    <div className="absolute -right-16 md:-right-24 top-1/2 -translate-y-1/2 bg-[#0B0B1E]/80 border border-orange-500/50 rounded-lg px-3 py-1.5 shadow-lg backdrop-blur-md">
                                        <p className="text-[10px] text-slate-400 uppercase">Taxa</p>
                                        <p className="text-orange-400 font-bold text-sm whitespace-nowrap">
                                            {stage.rate.toFixed(1)}%
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Arrow Down */}
                            {index < stages.length - 1 && (
                                <div className="flex justify-center my-3 opacity-30 group-hover:opacity-100 transition-opacity">
                                    <ArrowDown className="text-orange-400" size={24} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Summary Stats */}
            <div className="mt-10 pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                <div className="text-center p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-2">Sessões → Carrinho</p>
                    <p className="text-white font-bold text-xl">{funnel.cartRate.toFixed(2)}%</p>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-2">Carrinho → Checkout</p>
                    <p className="text-white font-bold text-xl">{funnel.checkoutRate.toFixed(2)}%</p>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-2">Checkout → Transação</p>
                    <p className="text-white font-bold text-xl">{funnel.transactionRate.toFixed(2)}%</p>
                </div>
                <div className="text-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <p className="text-emerald-400 text-[10px] uppercase tracking-wider mb-2">Taxa Global</p>
                    <p className="text-emerald-300 font-bold text-xl">
                        {funnel.sessions > 0 ? ((funnel.transactions / funnel.sessions) * 100).toFixed(2) : 0}%
                    </p>
                </div>
            </div>
        </div>
    );
}
