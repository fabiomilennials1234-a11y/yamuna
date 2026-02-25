"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

interface AnimatedNumberProps {
    value: number;
    format?: 'currency' | 'number' | 'percent' | 'decimal';
    className?: string;
}

export function AnimatedNumber({ value, format = 'number', className }: AnimatedNumberProps) {
    const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
    const display = useTransform(spring, (current) => {
        if (format === 'currency') {
            return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(current);
        } else if (format === 'percent') {
            return current.toFixed(2) + '%';
        } else if (format === 'decimal') {
            return current.toFixed(2);
        }
        return Math.round(current).toLocaleString('pt-BR');
    });

    useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    return <motion.span className={className}>{display}</motion.span>;
}
