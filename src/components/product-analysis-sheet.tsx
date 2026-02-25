"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Loader2, TrendingUp, Package, AlertTriangle, CalendarClock } from "lucide-react";
import { fetchProductAnalysis } from "@/app/products-actions";
import {
    Area,
    AreaChart,
    CartesianGrid,
    XAxis,
} from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent
} from "@/components/ui/chart";

interface ProductAnalysisSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: {
        code: string;
        name: string;
    } | null;
}

export function ProductAnalysisSheet({ open, onOpenChange, product }: ProductAnalysisSheetProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [channel, setChannel] = useState<'all' | 'b2b' | 'b2c'>('all');
    const [granularity, setGranularity] = useState<'month' | 'week'>('month');

    // Reset filters when product changes
    useEffect(() => {
        if (open) {
            setChannel('all');
            setGranularity('month');
        }
    }, [open, product]);

    useEffect(() => {
        if (open && product) {
            setLoading(true);
            fetchProductAnalysis(product.code, product.name, channel, granularity)
                .then(setData)
                .catch(err => console.error("Failed to load analysis", err))
                .finally(() => setLoading(false));
        } else {
            setData(null);
        }
    }, [open, product, channel, granularity]);

    if (!product) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-2xl overflow-y-auto bg-[#050510] border-l-white/10 text-slate-200">
                <SheetHeader className="mb-6 space-y-4">
                    <div>
                        <SheetTitle className="text-2xl font-bold text-white flex gap-2 items-center">
                            {product.name}
                        </SheetTitle>
                        <SheetDescription className="text-slate-400">
                            Código: <span className="font-mono text-xs bg-slate-800 px-1 py-0.5 rounded">{product.code}</span>
                        </SheetDescription>
                    </div>

                    <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5 w-fit">
                        <button
                            onClick={() => setChannel('all')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${channel === 'all' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setChannel('b2b')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${channel === 'b2b' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            B2B
                        </button>
                        <button
                            onClick={() => setChannel('b2c')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${channel === 'b2c' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            B2C
                        </button>
                    </div>
                </SheetHeader>

                {loading ? (
                    <div className="flex h-[400px] items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={40} />
                    </div>
                ) : data ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* 1. CHART SECTION */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <TrendingUp size={18} className="text-emerald-400" />
                                    Vendas ({granularity === 'month' ? 'Mensal' : 'Semanal'})
                                </h3>
                                <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1 border border-white/5">
                                    <button
                                        onClick={() => setGranularity('month')}
                                        className={`px-2 py-1 text-[10px] rounded transition-all ${granularity === 'month' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Mês
                                    </button>
                                    <button
                                        onClick={() => setGranularity('week')}
                                        className={`px-2 py-1 text-[10px] rounded transition-all ${granularity === 'week' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Semana
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs justify-end pb-2">
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(217 91% 60%)', border: '1px solid hsl(217 91% 60%)' }}></div> Realizado</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142 76% 36% / 0.5)', border: '1px dashed hsl(142 76% 36%)' }}></div> Previsão</div>
                            </div>

                            <div className="w-full bg-slate-900/30 rounded-xl p-4 border border-white/5">
                                <ChartContainer config={{
                                    real: {
                                        label: "Realizado",
                                        color: "hsl(217 91% 60%)" // Vibrant Blue
                                    },
                                    forecast: {
                                        label: "Previsão",
                                        color: "hsl(142 76% 36%)" // Emerald Green
                                    },
                                }} className="aspect-auto h-[300px] w-full">
                                    <AreaChart data={data.chartData.map((d: any) => ({
                                        ...d,
                                        real: d.isForecast ? null : d.sales,
                                        forecast: d.isForecast ? d.sales : null,
                                        // Fix gap: If this is the last real point, it should also be start of forecast? 
                                        // Simpler: Just render proper keys. Gap handling is visual.
                                    }))}>
                                        <defs>
                                            <linearGradient id="fillReal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0.1} />
                                            </linearGradient>
                                            <linearGradient id="fillForecast" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>

                                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#334155" opacity={0.5} />

                                        <XAxis
                                            dataKey="period"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            minTickGap={32}
                                            interval={granularity === 'week' ? 3 : 0}
                                        />

                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent labelFormatter={(val) => val} indicator="dot" />}
                                        />

                                        <Area
                                            dataKey="real"
                                            type="natural"
                                            fill="url(#fillReal)"
                                            stroke="hsl(217 91% 60%)"
                                            strokeWidth={2}
                                            stackId="a"
                                        />
                                        <Area
                                            dataKey="forecast"
                                            type="natural"
                                            fill="url(#fillForecast)"
                                            stroke="hsl(142 76% 36%)"
                                            strokeWidth={2}
                                            strokeDasharray="4 4"
                                            stackId="b"
                                        />
                                        <ChartLegend content={<ChartLegendContent />} />
                                    </AreaChart>
                                </ChartContainer>
                            </div>
                        </div>

                        {/* 2. STOCK FORECAST SECTION */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5 space-y-2">
                                <div className="text-slate-400 text-sm flex items-center gap-2">
                                    <Package size={16} /> Estoque Atual
                                </div>
                                <div className="text-2xl font-bold text-white">
                                    {data.stockStatus === 'unknown' ? '?' : data.stock} <span className="text-sm font-normal text-slate-500">unidades</span>
                                </div>
                                {data.stockStatus === 'unknown' && (
                                    <p className="text-xs text-amber-500">Não foi possível sincronizar com Tiny</p>
                                )}
                            </div>

                            <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5 space-y-2">
                                <div className="text-slate-400 text-sm flex items-center gap-2">
                                    <CalendarClock size={16} /> Cobertura
                                </div>
                                <div className="text-2xl font-bold text-white">
                                    {data.stockCoverageDays} <span className="text-sm font-normal text-slate-500">dias</span>
                                </div>
                                <p className="text-xs text-slate-500">Baseado na média {granularity === 'week' ? 'semanal' : 'mensal'} de {data.avgMonthlySales} un.</p>
                            </div>
                        </div>

                        {/* 3. SUGGESTION ALERT */}
                        {(data.stockCoverageDays < 30) ? (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-4 items-start">
                                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500 shrink-0">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-amber-400 mb-1">Atenção: Estoque Baixo</h4>
                                    <p className="text-sm text-amber-200/80">
                                        Seu estoque atual cobre apenas {data.stockCoverageDays} dias de vendas.
                                        Considerando o lead time aproximado, sugerimos realizar um novo pedido de compra para evitar ruptura.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-4 items-start">
                                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500 shrink-0">
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-emerald-400 mb-1">Estoque Saudável</h4>
                                    <p className="text-sm text-emerald-200/80">
                                        Você tem estoque garantido para {data.stockCoverageDays} dias. Nenhuma ação necessária por enquanto.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10 text-slate-500">
                        Erro ao carregar dados. Tente novamente mais tarde.
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
