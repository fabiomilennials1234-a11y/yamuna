// src/components/dashboard/stock-charts.tsx
"use client";

import { useMemo } from "react";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    BarChart, Cell, ReferenceLine, Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart";
import type { StockOverviewData, StockOverviewItem, StockHistoryData } from "@/app/stock-actions";

/* ── Chart Configs ─────────────────────────────────────────── */

const stockDemandConfig = {
    stock: { label: "Estoque Atual", color: "hsl(142 76% 36%)" },
    avgSales: { label: "Média Vendas/Mês", color: "hsl(234 89% 74%)" },
};

const coverageConfig = {
    coverage: { label: "Cobertura (dias)", color: "hsl(142 76% 36%)" },
};

const timelineConfig = {
    salesQuantity: { label: "Vendas Mensais", color: "hsl(234 89% 74%)" },
    stockLevel: { label: "Estoque (snapshot)", color: "hsl(142 76% 36%)" },
};

/* ── Status Colors ─────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
    critical: "#ef4444",
    warning: "#f59e0b",
    ok: "#10b981",
    unknown: "#64748b",
};

/* ── Props ─────────────────────────────────────────────────── */

interface StockChartsProps {
    data: StockOverviewData;
    history: StockHistoryData;
    selectedProduct: string | null;
    onProductSelect: (sku: string | null) => void;
}

/* ── Main Component ────────────────────────────────────────── */

export function StockCharts({ data, history, selectedProduct, onProductSelect }: StockChartsProps) {
    // Product list for the search dropdown
    const productList = useMemo(() =>
        data.items.map(item => ({ code: item.code, name: item.name })),
        [data.items]
    );

    return (
        <div className="space-y-4">
            {/* Product Search Filter */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <Select
                        value={selectedProduct || "__all__"}
                        onValueChange={(v) => onProductSelect(v === "__all__" ? null : v)}
                    >
                        <SelectTrigger className="pl-9 bg-[#050510] border-white/10">
                            <SelectValue placeholder="Buscar produto..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            <SelectItem value="__all__">Todos os produtos</SelectItem>
                            {productList.map(p => (
                                <SelectItem key={p.code} value={p.code}>
                                    <span className="font-mono text-xs text-slate-500 mr-2">{p.code}</span>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {selectedProduct && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-slate-400 hover:text-white"
                        onClick={() => onProductSelect(null)}
                    >
                        <X size={14} className="mr-1" />
                        Limpar filtro
                    </Button>
                )}
            </div>

            {/* Chart 1: Estoque vs Demanda */}
            <StockVsDemandChart
                items={data.items}
                selectedProduct={selectedProduct}
                onProductSelect={onProductSelect}
            />

            {/* Chart 2: Cobertura de Estoque */}
            <CoverageChart
                items={data.items}
                selectedProduct={selectedProduct}
                onProductSelect={onProductSelect}
            />

            {/* Chart 3: Evolução Temporal */}
            <StockTimelineChart
                history={history}
                selectedProduct={selectedProduct}
            />
        </div>
    );
}

/* ── Chart 1: Estoque Atual vs Demanda Mensal ──────────────── */

function StockVsDemandChart({
    items,
    selectedProduct,
    onProductSelect,
}: {
    items: StockOverviewItem[];
    selectedProduct: string | null;
    onProductSelect: (sku: string | null) => void;
}) {
    const chartData = useMemo(() => {
        const sorted = [...items]
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 15);

        return sorted.map(item => ({
            name: item.name.length > 18 ? item.name.substring(0, 18) + '…' : item.name,
            fullName: item.name,
            code: item.code,
            stock: item.currentStock,
            avgSales: item.avgMonthlySales,
            status: item.status,
            isSelected: selectedProduct === item.code,
        }));
    }, [items, selectedProduct]);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-semibold">
                            Estoque Atual vs Demanda Mensal
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                            Barras = estoque atual | Linha = média de vendas/mês
                        </p>
                    </div>
                    <span className="text-xs text-muted-foreground">Top 15 por receita</span>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={stockDemandConfig} className="h-[280px] w-full">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 20, left: 0, bottom: 60 }}
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            tick={{ fontSize: 10, fill: "#64748b" }}
                        />
                        <YAxis
                            yAxisId="left"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fill: "#64748b" }}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(_, payload) => {
                                        const item = payload?.[0]?.payload;
                                        return item?.fullName || '';
                                    }}
                                />
                            }
                        />
                        <Bar
                            yAxisId="left"
                            dataKey="stock"
                            radius={[4, 4, 0, 0]}
                            onClick={(entry) => {
                                if (entry?.code) {
                                    onProductSelect(
                                        selectedProduct === entry.code ? null : entry.code
                                    );
                                }
                            }}
                            cursor="pointer"
                        >
                            {chartData.map((entry, idx) => (
                                <Cell
                                    key={idx}
                                    fill={STATUS_COLORS[entry.status] || STATUS_COLORS.unknown}
                                    opacity={selectedProduct && !entry.isSelected ? 0.25 : 1}
                                />
                            ))}
                        </Bar>
                        <Line
                            yAxisId="left"
                            dataKey="avgSales"
                            type="monotone"
                            stroke="var(--color-avgSales)"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                    </ComposedChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

/* ── Chart 2: Cobertura de Estoque (Horizontal Bars) ───────── */

function CoverageChart({
    items,
    selectedProduct,
    onProductSelect,
}: {
    items: StockOverviewItem[];
    selectedProduct: string | null;
    onProductSelect: (sku: string | null) => void;
}) {
    const chartData = useMemo(() => {
        const filtered = items
            .filter(item => item.coverageDays < 999 && item.coverageDays > 0)
            .sort((a, b) => a.coverageDays - b.coverageDays)
            .slice(0, 20);

        return filtered.map(item => ({
            name: item.name.length > 25 ? item.name.substring(0, 25) + '…' : item.name,
            fullName: item.name,
            code: item.code,
            coverage: item.coverageDays,
            status: item.status,
            isSelected: selectedProduct === item.code,
        }));
    }, [items, selectedProduct]);

    const chartHeight = Math.max(200, chartData.length * 32 + 40);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div>
                    <CardTitle className="text-sm font-semibold">
                        Cobertura de Estoque (dias)
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        Quanto tempo o estoque atual dura com a demanda atual
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={coverageConfig} className="w-full" style={{ height: chartHeight }}>
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 40, left: 120, bottom: 5 }}
                    >
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                            type="number"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fill: "#64748b" }}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            width={115}
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(_, payload) => {
                                        const item = payload?.[0]?.payload;
                                        return item?.fullName || '';
                                    }}
                                    formatter={(value) => [`${value} dias`, 'Cobertura']}
                                />
                            }
                        />
                        <ReferenceLine x={15} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
                        <ReferenceLine x={45} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
                        <Bar
                            dataKey="coverage"
                            radius={[0, 4, 4, 0]}
                            onClick={(entry) => {
                                if (entry?.code) {
                                    onProductSelect(
                                        selectedProduct === entry.code ? null : entry.code
                                    );
                                }
                            }}
                            cursor="pointer"
                        >
                            {chartData.map((entry, idx) => (
                                <Cell
                                    key={idx}
                                    fill={STATUS_COLORS[entry.status] || STATUS_COLORS.unknown}
                                    opacity={selectedProduct && !entry.isSelected ? 0.25 : 1}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

/* ── Chart 3: Evolução Temporal ────────────────────────────── */

function StockTimelineChart({
    history,
    selectedProduct,
}: {
    history: StockHistoryData;
    selectedProduct: string | null;
}) {
    const chartData = useMemo(() => {
        if (!history.hasSnapshots || history.timeline.length === 0) return [];

        return history.timeline.map(point => ({
            date: new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            rawDate: point.date,
            salesQuantity: point.salesQuantity,
            stockLevel: point.stockLevel,
        }));
    }, [history]);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-semibold">
                            Evolução Temporal
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                            Vendas mensais + snapshots de estoque
                            {selectedProduct ? ` — ${selectedProduct}` : ' — Geral'}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="h-[200px] flex flex-col items-center justify-center text-center">
                        <p className="text-sm text-muted-foreground">
                            Snapshots de estoque começam a ser salvos a partir de hoje.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            O gráfico temporal vai ganhando corpo automaticamente.
                        </p>
                    </div>
                ) : (
                    <ChartContainer config={timelineConfig} className="h-[250px] w-full">
                        <ComposedChart
                            data={chartData}
                            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id="fillSalesTimeline" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-salesQuantity)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--color-salesQuantity)" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 10, fill: "#64748b" }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 10, fill: "#64748b" }}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area
                                dataKey="salesQuantity"
                                type="monotone"
                                fill="url(#fillSalesTimeline)"
                                stroke="var(--color-salesQuantity)"
                                strokeWidth={2}
                            />
                            <Line
                                dataKey="stockLevel"
                                type="monotone"
                                stroke="var(--color-stockLevel)"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "var(--color-stockLevel)", strokeWidth: 2, stroke: "#050510" }}
                                connectNulls={false}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                        </ComposedChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
