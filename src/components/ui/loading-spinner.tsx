"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ size = "default", className }: { size?: "sm" | "default" | "lg", className?: string }) {
    const sizeClasses = {
        sm: "h-8 w-8",
        default: "h-12 w-12",
        lg: "h-16 w-16"
    };

    return (
        <div className={cn("flex items-center justify-center", className)}>
            <motion.div
                className={`${sizeClasses[size]} relative`}
                animate={{ rotate: 360 }}
                transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear"
                }}
            >
                <svg
                    className="absolute inset-0"
                    viewBox="0 0 50 50"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <motion.circle
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="text-primary"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: [0, 0.8, 0] }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </svg>
            </motion.div>
        </div>
    );
}

export function LoadingScreen() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <LoadingSpinner size="lg" />
            <motion.p
                className="text-muted-foreground text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                Carregando dados...
            </motion.p>
        </div>
    );
}
