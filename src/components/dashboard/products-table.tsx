"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart, TrendingUp, TrendingDown, Minus, Eye, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProductAnalysisSheet } from "@/components/product-analysis-sheet";
import { Button } from "@/components/ui/button";

interface Product {
    code: string;
    name: string;
    quantity: number;
    revenue: number;
    revenuePercentage: number;
    percentage: number;
    trend: {
        value: number;
        direction: 'up' | 'down' | 'neutral';
    };
}

interface ProductsTableProps {
    initialData: {
        all: Product[];
        b2b: Product[];
        b2c: Product[];
    };
    currentLimit: string;
}

export function ProductsTable({ initialData, currentLimit }: ProductsTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Default to 'all' or whatever is in URL (for deep linking)
    const initialChannel = searchParams.get("channel") || 'all';
    const [activeChannel, setActiveChannel] = useState(initialChannel);

    // Analysis Sheet State
    const [selectedProduct, setSelectedProduct] = useState<{ code: string, name: string } | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    // Select products based on active channel from MEMORY (Instant!)
    // Safe access in case initialData is undefined
    const products = initialData[activeChannel as keyof typeof initialData] || initialData.all || [];

    // Debug: Log current state
    useEffect(() => {
        console.log(`[ProductsTable] Active Channel: ${activeChannel} | Products Count: ${products.length}`);
        console.log(`[ProductsTable] Available Data:`, {
            all: initialData.all?.length || 0,
            b2b: initialData.b2b?.length || 0,
            b2c: initialData.b2c?.length || 0
        });
    }, [activeChannel, products.length]);

    const handleChannelChange = (channel: string) => {
        setActiveChannel(channel);

        // Shallow update URL for shareability without hard refresh
        const params = new URLSearchParams(searchParams);
        params.set("channel", channel);
        window.history.replaceState(null, '', `?${params.toString()}`);
    };

    const openAnalysis = (product: Product) => {
        setSelectedProduct({ code: product.code, name: product.name });
        setSheetOpen(true);
    };

    const isShowAll = currentLimit === "1000";

    return (
        <div className="space-y-6">
            {/* Channel Selector - Instant Client Side */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#050510]/50 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Canal:</span>
                    <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5">
                        <button
                            onClick={() => handleChannelChange('all')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeChannel === 'all'
                                ? 'bg-indigo-500/20 text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => handleChannelChange('b2b')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeChannel === 'b2b'
                                ? 'bg-blue-500/20 text-blue-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            B2B (Empresas)
                        </button>
                        <button
                            onClick={() => handleChannelChange('b2c')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeChannel === 'b2c'
                                ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            B2C (Consumidor)
                        </button>
                    </div>
                </div>
                {/* Removed 'Show All' Toggle as requested */}
            </div>

            <Card className="overflow-hidden transition-opacity duration-300 opacity-100">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="text-primary" size={24} />
                        Curva ABC - {activeChannel === 'all' ? 'Geral' : activeChannel === 'b2b' ? 'B2B' : 'B2C'}
                    </CardTitle>
                    <span className="text-xs bg-muted py-1 px-3 rounded-full border">
                        {products.length} produtos listados
                    </span>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left border-collapse relative">
                            <thead className="bg-[#050510] text-slate-400 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4">Código</th>
                                    <th className="px-6 py-4">Produto (Normalizado)</th>
                                    <th className="px-6 py-4 text-right">Qtd</th>
                                    <th className="px-6 py-4 text-right">Receita</th>
                                    <th className="px-6 py-4 text-right">% Rec.</th>
                                    <th className="px-6 py-4 text-right">Acum.</th>
                                    <th className="px-6 py-4 text-right">Tendência (Mês Ant.)</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-3 rounded-full bg-slate-800/50">
                                                    <ShoppingCart className="text-slate-600" size={24} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-medium">Nenhum produto encontrado</p>
                                                    <p className="text-xs text-slate-600">
                                                        Canal: {activeChannel === 'all' ? 'Todos' : activeChannel === 'b2b' ? 'B2B (Empresas)' : 'B2C (Consumidor)'}
                                                    </p>
                                                    <p className="text-xs text-slate-600">
                                                        Tente selecionar outro período ou canal
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((product, i) => {
                                        const isClassA = product.percentage <= 80;
                                        const isClassB = product.percentage > 80 && product.percentage <= 95;
                                        const rowClass = isClassA
                                            ? 'hover:bg-emerald-500/5 hover:shadow-[inset_2px_0_0_0_rgba(16,185,129,0.5)]'
                                            : isClassB
                                                ? 'hover:bg-amber-500/5 hover:shadow-[inset_2px_0_0_0_rgba(245,158,11,0.5)]'
                                                : 'hover:bg-white/5';

                                        return (
                                            <tr key={i} className={`transition-all duration-200 group ${rowClass}`}>
                                                <td className="px-6 py-3 font-mono text-xs text-slate-500 border-r border-transparent group-hover:border-white/5">
                                                    {product.code}
                                                </td>
                                                <td className="px-6 py-3 font-medium text-white max-w-[300px] truncate" title={product.name}>
                                                    {product.name}
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono text-slate-300">
                                                    {product.quantity}
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono text-white font-bold">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.revenue)}
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono">
                                                    <div className="flex justify-end">
                                                        <div className={`px-2 py-0.5 rounded text-[10px] w-14 text-center ${isClassA ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                                            {product.revenuePercentage.toFixed(1)}%
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono text-xs">
                                                    <span className={`${isClassA ? 'text-emerald-500 font-bold' : isClassB ? 'text-amber-500' : 'text-slate-600'}`}>
                                                        {product.percentage.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono text-xs">
                                                    <div className={`flex items-center justify-end gap-1 ${product.trend.direction === 'up' ? 'text-emerald-400' :
                                                        product.trend.direction === 'down' ? 'text-rose-400' : 'text-slate-500'
                                                        }`}>
                                                        {product.trend.direction === 'up' && <TrendingUp size={14} />}
                                                        {product.trend.direction === 'down' && <TrendingDown size={14} />}
                                                        {product.trend.direction === 'neutral' && <Minus size={14} />}
                                                        <span>{product.trend.value.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500/20 hover:text-indigo-400"
                                                        onClick={() => openAnalysis(product)}
                                                        title="Ver Análise Completa"
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

            <ProductAnalysisSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                product={selectedProduct}
            />
        </div>
    );
}
