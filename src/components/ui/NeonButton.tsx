"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

const neonButtonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 uppercase tracking-widest",
    {
        variants: {
            variant: {
                gold:
                    "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-full shadow-[0_0_20px_rgba(253,224,71,0.3)] hover:shadow-[0_0_30px_rgba(253,224,71,0.6)] border border-yellow-300/50",
                purple:
                    "bg-white/5 backdrop-blur-md rounded-full border border-purple-500/50 text-white hover:bg-purple-500/20 hover:border-purple-400 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)]",
                ghost:
                    "bg-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-full",
            },
            size: {
                default: "h-12 px-8 py-2",
                sm: "h-10 px-6",
                lg: "h-14 px-10 text-base",
                icon: "h-12 w-12",
            },
        },
        defaultVariants: {
            variant: "gold",
            size: "default",
        },
    }
);

export interface NeonButtonProps
    extends Omit<HTMLMotionProps<"button">, "ref">,
    VariantProps<typeof neonButtonVariants> {
    asChild?: boolean;
}

const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <motion.button
                className={cn(neonButtonVariants({ variant, size, className }))}
                ref={ref}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                {...props}
            />
        );
    }
);
NeonButton.displayName = "NeonButton";

export { NeonButton, neonButtonVariants };
