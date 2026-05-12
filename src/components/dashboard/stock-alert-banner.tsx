import Link from "next/link";
import { fetchStockOverview } from "@/app/stock-actions";
import { IconAlertTriangle, IconArrowRight } from "@tabler/icons-react";

interface Props {
    startDate: string;
    endDate: string;
}

export async function StockAlertBanner({ startDate, endDate }: Props) {
    const data = await fetchStockOverview(startDate, endDate, 30);

    const alerts = data.items.filter(i => i.status === "critical" || i.status === "warning");
    if (alerts.length === 0) return null;

    const critical = alerts.filter(i => i.status === "critical");
    const warning = alerts.filter(i => i.status === "warning");
    const hasCritical = critical.length > 0;

    const accent = hasCritical
        ? {
            ring: "ring-red-500/20",
            glow: "shadow-[0_0_60px_-20px_rgba(239,68,68,0.35)]",
            iconBg: "bg-red-500/10 text-red-400 ring-1 ring-red-500/30",
            line: "from-red-500/0 via-red-500/40 to-red-500/0",
        }
        : {
            ring: "ring-amber-500/20",
            glow: "shadow-[0_0_60px_-20px_rgba(251,191,36,0.3)]",
            iconBg: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30",
            line: "from-amber-500/0 via-amber-500/40 to-amber-500/0",
        };

    const preview = alerts.slice(0, 6);
    const remaining = alerts.length - preview.length;

    return (
        <Link
            href="/estoque"
            className={`group relative block rounded-xl bg-gradient-to-b from-card to-card/40 ring-1 ${accent.ring} ${accent.glow} hover:ring-white/20 transition-all overflow-hidden`}
        >
            <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent.line}`} />

            <div className="flex items-start gap-4 p-5">
                <div className={`shrink-0 size-10 rounded-lg flex items-center justify-center ${accent.iconBg}`}>
                    <IconAlertTriangle className="size-5" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-semibold tracking-tight text-foreground">
                                Estoque abaixo do ideal
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {critical.length > 0 && (
                                    <span className="text-red-400 font-medium">
                                        {critical.length} {critical.length === 1 ? "crítico" : "críticos"}
                                    </span>
                                )}
                                {critical.length > 0 && warning.length > 0 && (
                                    <span className="text-muted-foreground/60 mx-1.5">·</span>
                                )}
                                {warning.length > 0 && (
                                    <span className="text-amber-400 font-medium">
                                        {warning.length} em atenção
                                    </span>
                                )}
                                <span className="text-muted-foreground/70 ml-2">
                                    de {data.summary.total} SKUs analisados
                                </span>
                            </p>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                            Ver estoque
                            <IconArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>

                    <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                        {preview.map(item => {
                            const dot = item.status === "critical" ? "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]";
                            return (
                                <li key={item.code} className="flex items-center gap-3 min-w-0">
                                    <span className={`shrink-0 size-1.5 rounded-full ${dot}`} />
                                    <span className="truncate text-sm text-foreground/90">
                                        {item.name}
                                    </span>
                                    <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                                        {item.coverageDays}d · {item.currentStock} un
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    {remaining > 0 && (
                        <p className="mt-3 text-xs text-muted-foreground">
                            +{remaining} {remaining === 1 ? "produto" : "produtos"} em alerta
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}

export function StockAlertBannerSkeleton() {
    return (
        <div className="rounded-xl bg-card ring-1 ring-white/5 p-5">
            <div className="flex items-start gap-4">
                <div className="size-10 rounded-lg bg-muted/40 animate-pulse" />
                <div className="flex-1 space-y-3">
                    <div className="h-4 w-48 bg-muted/40 rounded animate-pulse" />
                    <div className="h-3 w-72 bg-muted/30 rounded animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-4 bg-muted/20 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
