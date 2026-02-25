"use client";

import { Suspense } from "react";

export function PageLoader({ children }: { children: React.ReactNode }) {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-screen bg-slate-950">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-400 text-sm">Carregando dados...</p>
                    </div>
                </div>
            }
        >
            {children}
        </Suspense>
    );
}
