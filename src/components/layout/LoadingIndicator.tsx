"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function LoadingIndicator() {
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Show loading when route changes
        setLoading(true);
        setProgress(0);

        // Animate progress
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + 10;
            });
        }, 100);

        // Hide after route is loaded
        const timer = setTimeout(() => {
            setProgress(100);
            setTimeout(() => setLoading(false), 200);
        }, 800);

        return () => {
            clearTimeout(timer);
            clearInterval(progressInterval);
        };
    }, [pathname]);

    if (!loading) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-slate-950">
            <div
                className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 transition-all duration-300 ease-out shadow-lg shadow-indigo-500/50"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
