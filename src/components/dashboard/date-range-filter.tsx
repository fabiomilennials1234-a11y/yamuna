"use client";

import { CalendarIcon, CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const FILTER_STORAGE_KEY = "dashboard-date-filter";

export function DateRangeFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Using date objects for the Calendar component
    const [date, setDate] = useState<{
        from: Date | undefined;
        to: Date | undefined;
    }>({
        from: undefined,
        to: undefined,
    });

    const [isOpen, setIsOpen] = useState(false);
    const [showApplied, setShowApplied] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const defaultEnd = new Date();
        const defaultStart = subDays(defaultEnd, 30);

        // Try to load from localStorage first
        const stored = localStorage.getItem(FILTER_STORAGE_KEY);
        let start = defaultStart;
        let end = defaultEnd;

        if (stored) {
            try {
                const { startStr, endStr } = JSON.parse(stored);
                if (startStr && startStr !== '30daysAgo') {
                    const [y, m, d] = startStr.split('-').map(Number);
                    start = new Date(y, m - 1, d);
                }
                if (endStr && endStr !== 'today') {
                    const [y, m, d] = endStr.split('-').map(Number);
                    end = new Date(y, m - 1, d);
                }
            } catch (err) {
                console.error('[DateRangeFilter] Failed to parse stored filter', err);
            }
        }

        // Override with URL params if present
        const startStr = searchParams.get("start");
        const endStr = searchParams.get("end");

        if (startStr && startStr !== '30daysAgo') {
            const [y, m, d] = startStr.split('-').map(Number);
            start = new Date(y, m - 1, d);
        }
        if (endStr && endStr !== 'today') {
            const [y, m, d] = endStr.split('-').map(Number);
            end = new Date(y, m - 1, d);
        }

        setDate({ from: start, to: end });
    }, [searchParams]);

    const handleApply = (newDate: { from: Date | undefined; to: Date | undefined } | undefined) => {
        if (!newDate?.from) return;

        setDate(newDate);

        if (newDate.from && newDate.to) {
            const startStr = format(newDate.from, "yyyy-MM-dd");
            const endStr = format(newDate.to, "yyyy-MM-dd");

            // Save to localStorage for persistence across pages
            localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ startStr, endStr }));

            const params = new URLSearchParams(searchParams.toString());
            params.set("start", startStr);
            params.set("end", endStr);

            console.log(`[DateRangeFilter] Applying filter: ${startStr} to ${endStr}`);
            console.log(`[DateRangeFilter] New URL: ${pathname}?${params.toString()}`);

            setIsOpen(false);

            // Show "Filter Applied" message
            setShowApplied(true);
            setTimeout(() => setShowApplied(false), 2000);

            router.push(`${pathname}?${params.toString()}`);
        }
    };

    return (
        <div className="grid gap-2">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "dd/MM/yyyy")} -{" "}
                                    {format(date.to, "dd/MM/yyyy")}
                                </>
                            ) : (
                                format(date.from, "dd/MM/yyyy")
                            )
                        ) : (
                            <span>Selecione uma data</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={handleApply}
                        numberOfMonths={2}
                        locale={ptBR}
                    />
                </PopoverContent>
            </Popover>

            {/* Filter Applied Confirmation */}
            {showApplied && (
                <div className="flex items-center gap-2 text-xs text-emerald-500 animate-in fade-in slide-in-from-top-1 duration-200">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="font-medium">Filtro Aplicado</span>
                </div>
            )}
        </div>
    );
}
