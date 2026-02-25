"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";

interface ToastProps {
    message: string;
    type?: "success" | "error" | "info";
    duration?: number;
    onClose: () => void;
}

export function Toast({ message, type = "success", duration = 3000, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColors = {
        success: "bg-emerald-600",
        error: "bg-red-600",
        info: "bg-indigo-600"
    };

    return (
        <div className="fixed top-4 right-4 z-[200] animate-[slideIn_0.3s_ease-out]">
            <div className={`${bgColors[type]} text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px]`}>
                {type === "success" && <CheckCircle className="w-5 h-5" />}
                <span className="flex-1 font-medium">{message}</span>
                <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <style jsx>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}

export function useToast() {
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
        setToast({ message, type });
    };

    const ToastComponent = toast ? (
        <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
        />
    ) : null;

    return { showToast, ToastComponent };
}
