"use client";

import { ChevronDown, CheckIcon } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const FILTER_STORAGE_KEY = "dashboard-date-filter";

interface MonthOption {
    value: string;         // unique key
    label: string;         // display label
    start: string;         // yyyy-MM-dd
    end: string;           // yyyy-MM-dd
}

function buildMonthOptions(): MonthOption[] {
    const today = new Date();
    const options: MonthOption[] = [];

    // "Geral" = últimos 12 meses
    options.push({
        value: "geral",
        label: "Geral (12 meses)",
        start: format(startOfMonth(subMonths(today, 11)), "yyyy-MM-dd"),
        end: format(today, "yyyy-MM-dd"),
    });

    // Last 12 months (individual)
    for (let i = 0; i < 12; i++) {
        const month = subMonths(today, i);
        const isCurrentMonth = i === 0;
        options.push({
            value: format(month, "yyyy-MM"),
            label: format(month, "MMMM yyyy", { locale: ptBR })
                .replace(/^\w/, c => c.toUpperCase()),
            start: format(startOfMonth(month), "yyyy-MM-dd"),
            end: isCurrentMonth
                ? format(today, "yyyy-MM-dd")
                : format(endOfMonth(month), "yyyy-MM-dd"),
        });
    }

    return options;
}

export function DateRangeFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const options = useMemo(() => buildMonthOptions(), []);

    // Detect active option from URL params
    const activeOption = useMemo(() => {
        const start = searchParams.get("start");
        const end = searchParams.get("end");
        if (!start || !end) return null;
        return options.find(o => o.start === start && o.end === end) ?? null;
    }, [searchParams, options]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // On mount: if no URL params, apply current month as default
    useEffect(() => {
        if (!mounted) return;

        // URL already has params — nothing to do
        if (searchParams.get("start") && searchParams.get("end")) return;

        // Try to restore from localStorage first
        const stored = localStorage.getItem(FILTER_STORAGE_KEY);
        if (stored) {
            try {
                const { startStr, endStr } = JSON.parse(stored);
                if (startStr && endStr) {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("start", startStr);
                    params.set("end", endStr);
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                    return;
                }
            } catch { /* ignore */ }
        }

        // Default: current month
        const currentMonth = options[1]; // index 0 = Geral, index 1 = current month
        if (currentMonth) {
            applyOption(currentMonth, false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]);

    function applyOption(option: MonthOption, pushHistory = true) {
        localStorage.setItem(
            FILTER_STORAGE_KEY,
            JSON.stringify({ startStr: option.start, endStr: option.end })
        );

        const params = new URLSearchParams(searchParams.toString());
        params.set("start", option.start);
        params.set("end", option.end);

        if (pushHistory) {
            router.push(`${pathname}?${params.toString()}`);
        } else {
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
    }

    const displayLabel = activeOption?.label ?? "Selecione o período";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="min-w-[200px] justify-between text-left font-normal"
                >
                    <span className="truncate">{displayLabel}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[220px] max-h-[400px] overflow-y-auto">
                {/* Geral */}
                <DropdownMenuItem
                    key={options[0].value}
                    onClick={() => applyOption(options[0])}
                    className="flex items-center justify-between"
                >
                    <span className="font-medium">{options[0].label}</span>
                    {activeOption?.value === options[0].value && (
                        <CheckIcon className="h-4 w-4 text-primary" />
                    )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Individual months */}
                {options.slice(1).map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onClick={() => applyOption(option)}
                        className="flex items-center justify-between"
                    >
                        <span>{option.label}</span>
                        {activeOption?.value === option.value && (
                            <CheckIcon className="h-4 w-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
