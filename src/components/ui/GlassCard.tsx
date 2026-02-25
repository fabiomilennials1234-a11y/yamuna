"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    hoverEffect?: boolean;
}

export function GlassCard({ children, className, delay = 0, hoverEffect = true }: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay * 0.1, ease: "easeOut" }}
            className={cn(
                "group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-md shadow-xl",
                hoverEffect && "transition-all duration-300 hover:bg-slate-800/40 hover:shadow-2xl hover:border-white/20 hover:-translate-y-1",
                className
            )}
        >
            {/* Ambient Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-50" />

            {/* Hover Glow Effect */}
            {hoverEffect && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent" />
                </div>
            )}

            <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                {children}
            </div>
        </motion.div>
    );
}
