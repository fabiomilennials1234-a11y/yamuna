export interface Metric {
    value: number;
    label: string;
    trend?: number; // percentage change
    trendDirection?: "up" | "down" | "neutral";
    prefix?: string;
    suffix?: string;
}

export interface FunnelStage {
    stage: string;
    users: number; // For the chart width
    value?: string; // e.g., "17.270"
    rate?: number; // Conversion rate to next step or from previous
    subLabel?: string; // "Taxa Carrinho"
}

export interface MetaAd {
    id: string;
    campaignName: string;
    thumbnail: string;
    spend: number;
    spendTrend: number; // percentage
    cpc: number;
    ctr: number;
    purchases: number;
    purchasesTrend: number;
    costPerPurchase: number;
    revenue: number;
    revenueTrend: number;
    roas: number;
    roasTrend: number;
}

export interface ABCProduct {
    code: string;
    name: string;
    revenue: number;
    revenueTrend: number;
    quantity: number;
    share: number; // % Acumulado
}

export interface FinanceMetric {
    label: string;
    value: number;
    trend: number;
    prefix?: string;
}
