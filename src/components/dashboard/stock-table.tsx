"use client";

import { useState } from "react";
import {
    Package, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
    Minus, XCircle, Filter
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductAnalysisSheet } from "@/components/product-analysis-sheet";
import type { StockOverviewData, StockOverviewItem } from "@/app/stock-actions";

interface StockTableProps {
    data: StockOverviewData;
    selectedProduct?: string | null;
    onProductClick?: (sku: string | null) => void;
}

type StatusFilter = 'all' | 'critical' | 'warning' | 'ok';

const statusConfig = {
    critical: { label: 'Critico', color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: XCircle, dotColor: 'bg-red-500' },
    warning: { label: 'Atencao', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: AlertTriangle, dotColor: 'bg-amber-500' },
    ok: { label: 'OK', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle2, dotColor: 'bg-emerald-500' },
    unknown: { label: 'Sem dados', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30', icon: Package, dotColor: 'bg-slate-500' },
};

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function StockTable({ data, selectedProduct, onProductClick }: StockTableProps) {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [analysisProduct, setAnalysisProduct] = useState<{ code: string; name: string } | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const filteredItems = statusFilter === 'all'
        ? data.items
        : data.items.filter(i => i.status === statusFilter);

    const openAnalysis = (item: StockOverviewItem) => {
        setAnalysisProduct({ code: item.code, name: item.name });
        setSheetOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard
                    label="Total SKUs"
                    value={data.summary.total}
                    icon={<Package size={20} />}
                    color="text-indigo-400"
                    bgColor="bg-indigo-500/10"
                    active={statusFilter === 'all'}
                    onClick={() => setStatusFilter('all')}
                />
                <SummaryCard
                    label="Critico"
                    value={data.summary.critical}
                    subtitle={`< ${STOCK_RULES_DISPLAY.CRITICAL} dias`}
                    icon={<XCircle size={20} />}
                    color="text-red-400"
                    bgColor="bg-red-500/10"
                    active={statusFilter === 'critical'}
                    onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
                />
                <SummaryCard
                    label="Atencao"
                    value={data.summary.warning}
                    subtitle={`< ${STOCK_RULES_DISPLAY.WARNING} dias`}
                    icon={<AlertTriangle size={20} />}
                    color="text-amber-400"
                    bgColor="bg-amber-500/10"
                    active={statusFilter === 'warning'}
                    onClick={() => setStatusFilter(statusFilter === 'warning' ? 'all' : 'warning')}
                />
                <SummaryCard
                    label="Saudavel"
                    value={data.summary.ok}
                    subtitle={`> ${STOCK_RULES_DISPLAY.WARNING} dias`}
                    icon={<CheckCircle2 size={20} />}
                    color="text-emerald-400"
                    bgColor="bg-emerald-500/10"
                    active={statusFilter === 'ok'}
                    onClick={() => setStatusFilter(statusFilter === 'ok' ? 'all' : 'ok')}
                />
            </div>

            {/* Filter indicator */}
            {statusFilter !== 'all' && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Filter size={14} />
                    <span>Filtrando por: <strong className="text-white">{statusConfig[statusFilter].label}</strong></span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setStatusFilter('all')}>
                        Limpar
                    </Button>
                </div>
            )}

            {/* Main Table */}
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Package className="text-indigo-400" size={24} />
                        Estoque por SKU
                    </CardTitle>
                    <span className="text-xs bg-muted py-1 px-3 rounded-full border">
                        {filteredItems.length} produtos
                    </span>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[650px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left border-collapse relative">
                            <thead className="bg-[#050510] text-slate-400 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-4">Status</th>
                                    <th className="px-4 py-4">SKU</th>
                                    <th className="px-4 py-4">Produto</th>
                                    <th className="px-4 py-4 text-right">Estoque</th>
                                    <th className="px-4 py-4 text-right">Media Mensal</th>
                                    <th className="px-4 py-4 text-right">Cobertura</th>
                                    <th className="px-4 py-4 text-right">Demanda 3m</th>
                                    <th className="px-4 py-4 text-right">Receita</th>
                                    <th className="px-4 py-4 text-right">Tendencia</th>
                                    <th className="px-4 py-4 text-right">Detalhe</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <Package className="text-slate-600" size={32} />
                                                <p className="font-medium">Nenhum produto encontrado</p>
                                                <p className="text-xs text-slate-600">Tente outro periodo ou filtro</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item, i) => {
                                        const cfg = statusConfig[item.status];
                                        const needsRestock = item.status === 'critical' || item.status === 'warning';
                                        const rowHighlight = item.status === 'critical'
                                            ? 'hover:bg-red-500/5 hover:shadow-[inset_2px_0_0_0_rgba(239,68,68,0.5)]'
                                            : item.status === 'warning'
                                                ? 'hover:bg-amber-500/5 hover:shadow-[inset_2px_0_0_0_rgba(245,158,11,0.5)]'
                                                : 'hover:bg-white/5';

                                        return (
                                            <tr
                                                key={i}
                                                data-sku={item.code}
                                                className={`transition-all duration-200 group ${rowHighlight} ${
                                                    selectedProduct === item.code
                                                        ? 'ring-1 ring-indigo-500/50 bg-indigo-500/5'
                                                        : ''
                                                }`}
                                                onClick={() => onProductClick?.(
                                                    selectedProduct === item.code ? null : item.code
                                                )}
                                                style={{ cursor: onProductClick ? 'pointer' : undefined }}
                                            >
                                                {/* Status */}
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dotColor}`} />
                                                        {cfg.label}
                                                    </Badge>
                                                </td>
                                                {/* SKU */}
                                                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                                    {item.code}
                                                </td>
                                                {/* Produto */}
                                                <td className="px-4 py-3 font-medium text-white max-w-[220px] truncate" title={item.name}>
                                                    {item.name}
                                                </td>
                                                {/* Estoque Atual */}
                                                <td className="px-4 py-3 text-right font-mono">
                                                    <span className={needsRestock ? 'text-red-400 font-bold' : 'text-slate-300'}>
                                                        {item.currentStock}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 ml-1">un</span>
                                                </td>
                                                {/* Media Mensal */}
                                                <td className="px-4 py-3 text-right font-mono text-slate-300">
                                                    {item.avgMonthlySales}
                                                    <span className="text-[10px] text-slate-500 ml-1">un/mes</span>
                                                </td>
                                                {/* Cobertura */}
                                                <td className="px-4 py-3 text-right font-mono">
                                                    <span className={
                                                        item.status === 'critical' ? 'text-red-400 font-bold' :
                                                        item.status === 'warning' ? 'text-amber-400' :
                                                        'text-emerald-400'
                                                    }>
                                                        {item.coverageDays >= 999 ? '---' : `${item.coverageDays}d`}
                                                    </span>
                                                </td>
                                                {/* Demanda 3 meses */}
                                                <td className="px-4 py-3 text-right font-mono text-slate-300">
                                                    {item.forecast3m}
                                                    <span className="text-[10px] text-slate-500 ml-1">un</span>
                                                </td>
                                                {/* Receita */}
                                                <td className="px-4 py-3 text-right font-mono text-white font-bold text-xs">
                                                    {fmt.format(item.revenue)}
                                                </td>
                                                {/* Tendencia */}
                                                <td className="px-4 py-3 text-right font-mono text-xs">
                                                    <div className={`flex items-center justify-end gap-1 ${
                                                        item.trend.direction === 'up' ? 'text-emerald-400' :
                                                        item.trend.direction === 'down' ? 'text-rose-400' : 'text-slate-500'
                                                    }`}>
                                                        {item.trend.direction === 'up' && <TrendingUp size={14} />}
                                                        {item.trend.direction === 'down' && <TrendingDown size={14} />}
                                                        {item.trend.direction === 'neutral' && <Minus size={14} />}
                                                        <span>{item.trend.value.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                {/* Detalhe */}
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500/20 hover:text-indigo-400"
                                                        onClick={() => openAnalysis(item)}
                                                        title="Ver Analise Completa"
                                                    >
                                                        <TrendingUp size={14} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Reuse existing product analysis sheet */}
            <ProductAnalysisSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                product={analysisProduct}
            />
        </div>
    );
}

/* ----- Summary Card Sub-Component ----- */

const STOCK_RULES_DISPLAY = { CRITICAL: 15, WARNING: 45 };

function SummaryCard({
    label, value, subtitle, icon, color, bgColor, active, onClick
}: {
    label: string;
    value: number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`p-4 rounded-xl border text-left transition-all ${
                active
                    ? `${bgColor} border-white/10 shadow-lg scale-[1.02]`
                    : 'bg-[#050510]/50 border-white/5 hover:border-white/10'
            }`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className={`${color}`}>{icon}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />}
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
        </button>
    );
}
