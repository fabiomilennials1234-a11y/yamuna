"use client";

import { motion } from "framer-motion";
import { FunnelStage } from "@/types/dashboard";
import { ArrowDown, Users, TrendingUp, ShoppingCart, CreditCard, CheckCircle } from "lucide-react";

interface FunnelChartProps {
    data: FunnelStage[];
    className?: string;
}

export function FunnelOverview({ data, className }: FunnelChartProps) {
    if (!data || data.length === 0) return null;

    const maxUsers = data[0]?.users || 0;

    const getIcon = (label: string = "") => {
        const l = label.toLowerCase();
        if (l.includes('sessões')) return <Users className="size-5" />;
        if (l.includes('carrinho')) return <ShoppingCart className="size-5" />;
        if (l.includes('checkout') || l.includes('iniciado')) return <CreditCard className="size-5" />;
        if (l.includes('transações') || l.includes('compra')) return <CheckCircle className="size-5" />;
        if (l.includes('estimado')) return <TrendingUp className="size-5" />; // Estimado/Projetado
        return <Users className="size-5" />;
    };

    const getGradient = (index: number) => {
        // Sophisticated Orange/Amber gradients for a premium feel
        const gradients = [
            "from-orange-500 to-amber-600 shadow-orange-500/20",
            "from-orange-600 to-amber-700 shadow-orange-600/20",
            "from-amber-600 to-orange-700 shadow-amber-600/20",
            "from-orange-700 to-red-700 shadow-orange-700/20",
            "from-red-600 to-red-800 shadow-red-600/20",
            "from-red-700 to-rose-900 shadow-red-700/20",
        ];
        return gradients[index % gradients.length];
    };

    return (
        <div className={`flex flex-col items-center w-full space-y-1 py-4 ${className}`}>
            {data.map((stage, index) => {
                const percentage = maxUsers > 0 ? (stage.users / maxUsers) * 100 : 0;
                // Min width 50% for readability to avoid squashed text
                const widthStyle = Math.max(percentage, 50);

                return (
                    <div key={(stage.subLabel || "stage") + index} className="w-full flex flex-col items-center relative z-10">
                        {/* Connector Arrow */}
                        {index > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 24, opacity: 1 }}
                                transition={{ delay: index * 0.1, duration: 0.3 }}
                                className="w-0.5 bg-gradient-to-b from-slate-700 to-slate-800 my-1 relative"
                            >
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 rounded-full p-1 border border-slate-700">
                                    <ArrowDown className="size-3 text-slate-500" />
                                </div>
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ width: "30%", opacity: 0, y: 20 }}
                            animate={{ width: `${widthStyle}%`, opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.8,
                                delay: index * 0.15,
                                type: "spring",
                                stiffness: 60
                            }}
                            className={`
                                relative w-full min-w-[300px] max-w-full md:max-w-[95%] rounded-xl 
                                bg-gradient-to-r ${getGradient(index)}
                                border border-white/10
                                shadow-xl backdrop-blur-sm
                                group hover:brightness-110 transition-all duration-300
                                flex items-center justify-between px-4 py-3 md:px-6 md:py-4
                            `}
                        >
                            {/* Left: Icon & Label */}
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md shadow-inner text-white">
                                    {getIcon(stage.subLabel)}
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-orange-100/70">
                                        {stage.subLabel}
                                    </span>
                                    <span className="text-white text-lg font-bold">
                                        {stage.stage}
                                    </span>
                                </div>
                            </div>

                            {/* Right: Value & Rate */}
                            <div className="flex flex-col items-end">
                                <span className="text-2xl font-black text-white tabular-nums tracking-tight drop-shadow-sm">
                                    {stage.value}
                                </span>
                                {stage.rate && (
                                    <span className="text-xs font-medium text-white/90 bg-black/20 px-2 py-0.5 rounded-full mt-1 backdrop-blur-sm">
                                        {Math.abs(stage.rate)}% conv.
                                    </span>
                                )}
                            </div>

                            {/* Glass Shine Effect */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/10 to-transparent opacity-50 pointer-events-none" />
                        </motion.div>
                    </div>
                );
            })}
        </div>
    );
}
