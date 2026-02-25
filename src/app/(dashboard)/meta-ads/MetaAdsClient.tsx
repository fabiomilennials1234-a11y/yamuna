"use client";

import { useState, useMemo } from "react";
import { CreativeModal } from "@/components/meta/CreativeModal";
import { Filter, Layers, Zap, DollarSign, MousePointer, ShoppingCart, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface Creative {
    id: string;
    name: string;
    status: string;
    imageUrl: string;
    videoUrl?: string | null;
    videoId?: string | null;
    embedHtml?: string | null;
    creativeType: 'image' | 'video';
    campaignObjective: string;
    spend: number;
    clicks: number;
    ctr: number;
    cpc: number;
    roas: number;
    purchases: number;
    revenue: number;
    cpa: number;
    leads: number;
    cpl: number;
    body?: string;
    title?: string;
    hookRate?: number;
    epc?: number;
}

interface MetaAdsClientProps {
    creatives: Creative[];
    startDate: string;
    endDate: string;
}

type SortKey = keyof Creative | 'hookRate' | 'epc';

export function MetaAdsClient({ creatives, startDate, endDate }: MetaAdsClientProps) {
    const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filter states
    const [metricFilter, setMetricFilter] = useState<string>("all");
    const [objectiveFilter, setObjectiveFilter] = useState<string>("all");

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'spend',
        direction: 'desc'
    });

    // Handle Column Header Click
    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' }; // Default to descending for metrics
        });
    };

    // Handle Dropdown Filter Change (also updates sort)
    const handleMetricFilterChange = (value: string) => {
        setMetricFilter(value);
        if (value !== 'all') {
            const map: Record<string, string> = {
                'roas': 'roas',
                'cpa': 'cpa',
                'ctr': 'ctr',
                'spend': 'spend',
                'revenue': 'revenue',
                'hook': 'hookRate',
                'epc': 'epc'
            };

            const key = map[value];
            if (key) {
                // CPA and CPL are better when lower
                const direction = key === 'cpa' || key === 'cpl' ? 'asc' : 'desc';
                setSortConfig({ key, direction });
            }
        }
    };

    // Get unique objectives for filter dropdown
    const uniqueObjectives = useMemo(() => {
        const objectives = new Set(creatives.map(c => c.campaignObjective));
        return Array.from(objectives).sort();
    }, [creatives]);

    // Filter creatives based on selected filters
    const filteredCreatives = useMemo(() => {
        let filtered = [...creatives];

        // Filter by objective
        if (objectiveFilter !== "all") {
            filtered = filtered.filter(c => c.campaignObjective === objectiveFilter);
        }

        // Apply Sorting
        filtered.sort((a, b) => {
            const key = sortConfig.key as keyof Creative;

            const valA = a[key] ?? 0;
            const valB = b[key] ?? 0;

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [creatives, objectiveFilter, sortConfig]);

    const handleThumbnailClick = (creative: Creative) => {
        setSelectedCreative(creative);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedCreative(null), 300);
    };

    // Helper for rendering sort arrow
    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={12} className="ml-1 text-indigo-400" />
            : <ArrowDown size={12} className="ml-1 text-indigo-400" />;
    };

    return (
        <>
            <Card className="overflow-hidden">


                {/* Filter / Header Bar */}
                <div className="relative p-6 border-b border-white/5 bg-slate-900/20">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Layers className="text-indigo-400" size={24} />
                                Top Criativos
                            </h2>
                            <p className="text-sm text-slate-400 mt-1 pl-8">
                                {startDate === "30daysAgo" ? "Últimos 30 dias" :
                                    endDate === "today" && startDate !== "30daysAgo" ? `${startDate} até hoje` :
                                        `${startDate} até ${endDate}`}
                            </p>
                        </div>

                        {/* Advanced Filters */}
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto bg-slate-950/30 p-2 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 px-2">
                                <Filter size={14} className="text-indigo-400" />
                                <span className="text-xs font-medium text-slate-300">Filtros:</span>
                            </div>

                            {/* Metric Filter */}
                            <select
                                value={metricFilter}
                                onChange={(e) => handleMetricFilterChange(e.target.value)}
                                className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <option value="all">Todas Métricas</option>
                                <option value="roas">Melhor ROAS</option>
                                <option value="cpa">Menor CPA</option>
                                <option value="ctr">Melhor CTR</option>
                                <option value="hook">Melhor Hook</option>
                                <option value="epc">Melhor EPC</option>
                                <option value="spend">Maior Gasto</option>
                                <option value="revenue">Maior Receita</option>
                            </select>

                            {/* Objective Filter */}
                            <select
                                value={objectiveFilter}
                                onChange={(e) => setObjectiveFilter(e.target.value)}
                                className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <option value="all">Todos Objetivos</option>
                                {uniqueObjectives.map(obj => (
                                    <option key={obj} value={obj}>{obj}</option>
                                ))}
                            </select>

                            {/* Results Count */}
                            <div className="px-3 py-1.5 bg-indigo-500/10 rounded-md ml-auto lg:ml-0">
                                <span className="text-xs font-bold text-indigo-300">
                                    {filteredCreatives.length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-950/60 text-slate-400 font-semibold text-xs uppercase tracking-wider backdrop-blur-sm select-none">
                            <tr>
                                <th className="px-6 py-4">Campanha / Anúncio</th>
                                <th className="px-6 py-4 text-center">Thumbnail</th>

                                <th onClick={() => handleSort('spend')} className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group" title="Custo publicidade">
                                    <div className="flex items-center justify-end">Inv. <SortIcon columnKey="spend" /></div>
                                </th>

                                <th onClick={() => handleSort('ctr')} className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group" title="Click Through Rate">
                                    <div className="flex items-center justify-end">CTR <SortIcon columnKey="ctr" /></div>
                                </th>

                                <th onClick={() => handleSort('hookRate')} className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group" title="Hook Rate (3s / Impressões)">
                                    <div className="flex items-center justify-end">Hook <SortIcon columnKey="hookRate" /></div>
                                </th>

                                <th onClick={() => handleSort('leads')} className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group" title="Leads capturados">
                                    <div className="flex items-center justify-end">Leads <SortIcon columnKey="leads" /></div>
                                </th>

                                <th onClick={() => handleSort('cpl')} className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group" title="Custo por Lead">
                                    <div className="flex items-center justify-end">CPL <SortIcon columnKey="cpl" /></div>
                                </th>

                                <th onClick={() => handleSort('purchases')} className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group" title="Compras realizadas">
                                    <div className="flex items-center justify-end">Compras <SortIcon columnKey="purchases" /></div>
                                </th>

                                <th onClick={() => handleSort('cpa')} className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group" title="Custo por Aquisição">
                                    <div className="flex items-center justify-end">CPA <SortIcon columnKey="cpa" /></div>
                                </th>

                                <th onClick={() => handleSort('epc')} className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group" title="Earnings Per Click">
                                    <div className="flex items-center justify-end">EPC <SortIcon columnKey="epc" /></div>
                                </th>

                                <th onClick={() => handleSort('revenue')} className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group" title="Receita gerada">
                                    <div className="flex items-center justify-end">Receita <SortIcon columnKey="revenue" /></div>
                                </th>

                                <th onClick={() => handleSort('roas')} className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group" title="Retorno sobre investimento">
                                    <div className="flex items-center justify-end">ROAS <SortIcon columnKey="roas" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                            {filteredCreatives.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="px-6 py-12 text-center text-slate-500 bg-slate-900/20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-3 rounded-full bg-slate-800/50">
                                                <Layers className="text-slate-600" size={24} />
                                            </div>
                                            <p>Nenhum dado encontrado.</p>
                                            <p className="text-xs text-slate-600">Verifique se há anúncios ativos e se o Token é válido.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCreatives.map((ad: Creative, i: number) => (
                                    <tr key={ad.id} className="group hover:bg-white/5 transition-all duration-200">
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <div className="flex items-start gap-3">
                                                <span className="text-slate-500 font-mono text-xs mt-0.5 w-5 text-right">{i + 1}.</span>
                                                <div>
                                                    <div className="font-medium text-white line-clamp-2 group-hover:text-indigo-300 transition-colors" title={ad.name}>
                                                        {ad.name}
                                                    </div>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                                            {ad.status}
                                                        </span>
                                                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                            {ad.campaignObjective}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleThumbnailClick(ad)}
                                                className="w-16 h-16 relative inline-block rounded-lg overflow-hidden bg-slate-800 border border-slate-700 shadow-md group-hover:ring-2 group-hover:ring-indigo-500/50 group-hover:shadow-indigo-500/20 transition-all cursor-pointer transform group-hover:scale-105"
                                            >
                                                {ad.imageUrl ? (
                                                    <>
                                                        <img
                                                            src={ad.imageUrl}
                                                            alt="Thumbnail"
                                                            className="w-full h-full object-cover"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                        {ad.creativeType === 'video' && (
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                                                                <div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                                                                    <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-slate-900 border-b-4 border-b-transparent ml-0.5"></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-[10px] text-slate-500">
                                                        <Layers size={16} />
                                                    </div>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-300">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ad.spend)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono">
                                            <div className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <MousePointer size={10} className="mr-1" />
                                                {ad.ctr.toFixed(2)}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-xs">
                                            {/* HOOK RATE */}
                                            {ad.creativeType === 'video' ? (
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded border",
                                                    (ad.hookRate || 0) > 30 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                        (ad.hookRate || 0) > 20 ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                                                            "bg-slate-800 text-slate-400 border-slate-700"
                                                )}>
                                                    {(ad.hookRate || 0).toFixed(1)}%
                                                </span>
                                            ) : <span className="text-slate-600">-</span>}
                                        </td>
                                        {/* HOLD RATE REMOVED */}
                                        <td className="px-6 py-4 text-right font-mono font-bold text-indigo-400">
                                            {ad.leads}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">
                                            {ad.leads > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ad.cpl) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-white">
                                            {ad.purchases}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ad.cpa)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-xs font-bold text-indigo-300">
                                            {/* EPC */}
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ad.epc || 0)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ad.revenue)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono">
                                            <div className={cn(
                                                "font-bold py-1 px-2 rounded inline-block min-w-[3rem] text-center",
                                                ad.roas >= 10 ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]" :
                                                    ad.roas >= 4 ? "bg-emerald-500/10 text-emerald-400" :
                                                        ad.roas >= 1 ? "bg-amber-500/10 text-amber-400" :
                                                            "bg-rose-500/10 text-rose-400"
                                            )}>
                                                {ad.roas.toFixed(2)}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Creative Modal */}
                <CreativeModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    creative={selectedCreative ? {
                        name: selectedCreative.name,
                        imageUrl: selectedCreative.imageUrl,
                        videoUrl: selectedCreative.videoUrl || undefined,
                        embedHtml: selectedCreative.embedHtml || undefined,
                        type: selectedCreative.creativeType,
                        body: selectedCreative.body,
                        title: selectedCreative.title
                    } : null}
                />
            </Card>
        </>
    );
}
