"use client";

import { Calendar, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { format, subDays, startOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Header({ title }: { title: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initialize with empty strings to avoid hydration mismatch
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showMobileModal, setShowMobileModal] = useState(false);

    // Store filter state globally to apply without URL params
    const [appliedStart, setAppliedStart] = useState("");
    const [appliedEnd, setAppliedEnd] = useState("");

    useEffect(() => {
        const defaultEnd = new Date();
        const defaultStart = subDays(defaultEnd, 30);

        const start = searchParams.get("start") || format(defaultStart, "yyyy-MM-dd");
        const end = searchParams.get("end") || format(defaultEnd, "yyyy-MM-dd");

        setStartDate(start);
        setEndDate(end);
        setAppliedStart(start);
        setAppliedEnd(end);
    }, [searchParams]);

    // Don't render date inputs until mounted to prevent mismatch
    if (!startDate || !endDate) {
        return (
            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 lg:px-8">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-white truncate">{title}</h2>
                <div className="w-[100px] md:w-[300px] h-10 bg-slate-800/50 rounded animate-pulse"></div>
            </header>
        );
    }

    const handleApply = () => {
        // Update applied state
        setAppliedStart(startDate);
        setAppliedEnd(endDate);
        setShowMobileModal(false);

        // Build URL params
        const params = new URLSearchParams(searchParams.toString());
        if (startDate) params.set("start", startDate);
        if (endDate) params.set("end", endDate);

        // Soft navigation (bypasses full reload, keeps client state)
        // Using replace to update current entry
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleMobileFilter = () => {
        setShowMobileModal(true);
    };

    return (
        <>
            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 lg:px-8">
                <h2 className="text-sm sm:text-base lg:text-xl font-semibold text-white truncate max-w-[60%] sm:max-w-none">
                    {title}
                </h2>

                <div className="flex items-center gap-2 md:gap-4">
                    {/* Desktop Date Pickers */}
                    <div className="hidden md:flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <div className="flex items-center px-2 border-r border-slate-700">
                            <Calendar size={16} className="text-slate-400 mr-2" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-sm text-slate-200 outline-none w-28 [&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                        <div className="flex items-center px-2">
                            <span className="text-slate-500 mr-2">até</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-sm text-slate-200 outline-none w-28 [&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                    </div>

                    {/* Filter Button */}
                    <button
                        onClick={() => {
                            if (window.innerWidth < 768) {
                                handleMobileFilter();
                            } else {
                                const btn = document.activeElement as HTMLButtonElement;
                                if (btn) btn.innerText = "Filtrando...";
                                handleApply();
                                setTimeout(() => { if (btn) btn.innerText = "Filtro Aplicado!"; }, 500);
                                setTimeout(() => { if (btn) btn.innerText = "Filtrar"; }, 2000);
                            }
                        }}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-2 rounded transition-colors whitespace-nowrap"
                    >
                        Filtrar
                    </button>
                </div>
            </header>

            {/* Mobile Filter Modal */}
            {showMobileModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-2xl animate-slide-up">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white">Filtrar Período</h3>
                            <button
                                onClick={() => setShowMobileModal(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Start Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Data Inicial
                                </label>
                                <div className="flex items-center bg-slate-800 rounded-lg p-3 border border-slate-700">
                                    <Calendar size={20} className="text-slate-400 mr-3" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-transparent text-white outline-none w-full [&::-webkit-calendar-picker-indicator]:invert"
                                    />
                                </div>
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Data Final
                                </label>
                                <div className="flex items-center bg-slate-800 rounded-lg p-3 border border-slate-700">
                                    <Calendar size={20} className="text-slate-400 mr-3" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-transparent text-white outline-none w-full [&::-webkit-calendar-picker-indicator]:invert"
                                    />
                                </div>
                            </div>

                            {/* Apply Button */}
                            <button
                                onClick={handleApply}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-colors"
                            >
                                Aplicar Filtro
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
