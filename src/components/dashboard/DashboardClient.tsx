"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DollarSign, ShoppingCart, Users, Rocket } from "lucide-react";

export function DashboardClient() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const startDate = searchParams.get("start") || "30daysAgo";
    const endDate = searchParams.get("end") || "today";

    useEffect(() => {
        let cancelled = false;

        async function fetchData() {
            setLoading(true);
            try {
                const params = new URLSearchParams({ start: startDate, end: endDate });
                const response = await fetch(`/api/dashboard?${params}`);
                const result = await response.json();

                if (!cancelled) {
                    setData(result);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error:", err);
                if (!cancelled) setLoading(false);
            }
        }

        fetchData();
        return () => { cancelled = true; };
    }, [startDate, endDate]);

    if (loading || !data) {
        return <DashboardSkeleton />;
    }

    const kpis = data.kpis;

    return (
        <main className="p-4 lg:p-8 space-y-6 overflow-y-auto w-full">
            {/* Row 1: Investimento + Custo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    label="Investimento"
                    value={kpis.investment}
                    icon={DollarSign}
                    isCurrency
                />
                <KPICard
                    label="% de Custo"
                    value={kpis.costPercentage}
                    suffix="%"
                    variant="warning"
                />
                <KPICard
                    label="Ticket Médio"
                    value={kpis.avgTicket}
                    isCurrency
                />
                <KPICard
                    label="Ticket Médio (Novos)"
                    value={kpis.avgTicketNewCustomers}
                    isCurrency
                />
            </div>

            {/* Row 2: Faturamento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard
                    label="Faturamento"
                    value={kpis.sales}
                    icon={ShoppingCart}
                    isCurrency
                    variant="success"
                />
                <KPICard
                    label="Receita Retenção"
                    value={kpis.retentionRevenue}
                    isCurrency
                />
                <KPICard
                    label="Receita Novos"
                    value={kpis.newRevenue}
                    isCurrency
                />
            </div>

            {/* Row 3: Clientes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard
                    label="Clientes Adquiridos"
                    value={kpis.acquiredCustomers}
                    icon={Users}
                />
                <KPICard
                    label="CAC"
                    value={kpis.cac}
                    isCurrency
                />
                <KPICard
                    label="Transações"
                    value={kpis.transactions}
                />
            </div>

            {/* Row 4: Long Term (12 Meses) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard
                    label="Faturamento 12 Meses"
                    value={kpis.revenue12Months}
                    icon={Rocket}
                    isCurrency
                    variant="info"
                />
                <KPICard
                    label="LTV (12 Meses)"
                    value={kpis.ltv12Months}
                    isCurrency
                    variant="info"
                />
                <KPICard
                    label="ROI (12 Meses)"
                    value={kpis.roi12Months}
                    suffix="%"
                    variant="info"
                />
            </div>
        </main>
    );
}

function KPICard({ label, value, prefix = "", suffix = "", variant = "default", isCurrency = false, icon: Icon }: any) {
    const variantClasses = {
        default: "bg-slate-900 border-slate-800",
        success: "bg-emerald-900/20 border-emerald-800/30",
        warning: "bg-amber-900/20 border-amber-800/30",
        info: "bg-indigo-900/20 border-indigo-800/30",
    };

    const displayValue = isCurrency
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
        : typeof value === 'number' ? value.toLocaleString('pt-BR') : value;

    return (
        <div className={`p-4 rounded-xl border ${variantClasses[variant as keyof typeof variantClasses]} flex flex-col justify-between h-[110px]`}>
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{label}</span>
                {Icon && <Icon className="w-4 h-4 text-slate-600" />}
            </div>
            <div className="text-2xl font-bold text-white mt-2">
                {prefix}{displayValue}{suffix}
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <main className="p-4 lg:p-8 space-y-6 overflow-y-auto w-full animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-[110px] bg-slate-900 border border-slate-800 rounded-xl"></div>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-[110px] bg-slate-900 border border-slate-800 rounded-xl"></div>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-[110px] bg-slate-900 border border-slate-800 rounded-xl"></div>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-[110px] bg-slate-900 border border-slate-800 rounded-xl"></div>
                ))}
            </div>
        </main>
    );
}
