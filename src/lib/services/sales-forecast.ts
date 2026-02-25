
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MonthlySales } from "./sales-history";

/**
 * Generates a sales forecast based on historical data.
 * Uses a weighted moving average of the last 3 months + trend adjustment.
 * 
 * @param history List of historical monthly sales
 * @param monthsToForecast Number of months to project (default 3)
 */
// Configuração de Pesos para Previsão
// Ajuste aqui para dar mais importância ao histórico vs momento atual
const FORECAST_WEIGHTS = {
    RECENT: 0.6,    // 60% baseado nos últimos 3 meses (Tendência Recente)
    HISTORY: 0.4    // 40% baseado no mesmo mês do ano anterior (Sazonalidade)
};

// Configuração de Alertas de Estoque (Dias de Cobertura)
// Ajuste estes valores conforme alinhado com o Pedro (Compras)
export const STOCK_RULES = {
    CRITICAL: 15, // Abaixo de 15 dias = Vermelho (Crítico)
    WARNING: 45,  // Entre 15 e 45 dias = Amarelo (Atenção)
    // Acima de 45 dias = Verde (OK)
};

export type StockStatus = 'critical' | 'warning' | 'ok';

/**
 * Calcula o status do estoque baseado nos dias de cobertura
 */
export function getStockStatus(coverageDays: number): StockStatus {
    if (coverageDays <= STOCK_RULES.CRITICAL) return 'critical';
    if (coverageDays <= STOCK_RULES.WARNING) return 'warning';
    return 'ok';
}

/**
 * Generates a sales forecast based on historical data.
 * Uses a Hybrid Weighted approach: recent trend + historical seasonality.
 * 
 * @param history List of historical monthly sales
 * @param monthsToForecast Number of months to project (default 3)
 */
export function generateForecast(history: MonthlySales[], monthsToForecast: number = 3): MonthlySales[] {
    if (!history || history.length === 0) return [];

    // --- 1. Calcular Tendência Recente (Weighted Average 3 Months) ---
    const last3Months = history.slice(-Math.min(history.length, 3));
    let recentWeightedSum = 0;

    // Pesos recentes: [0.2, 0.3, 0.5] (Mais recente vale mais)
    const recentWeights = [0.2, 0.3, 0.5].slice(-last3Months.length);
    const recentWeightTotal = recentWeights.reduce((a, b) => a + b, 0);

    last3Months.forEach((m, i) => {
        const weight = recentWeights[i] / recentWeightTotal;
        recentWeightedSum += m.sales * weight;
    });

    const recentTrendAvg = recentWeightedSum;

    // --- 2. Calcular Fator de Crescimento Anual (YoY Growth) ---
    // Compara os últimos 3 meses deste ano com os mesmos 3 meses do ano passado
    let growthFactor = 1.0;
    if (history.length >= 15) { // Precisa ter pelo menos 1 ano e 3 meses
        const last3Sales = last3Months.reduce((sum, h) => sum + h.sales, 0);

        // Encontrar os mesmos meses no ano anterior
        // Pegamos as datas dos ultimos 3 meses e subtraímos 1 ano
        const lastYearSalesValues = last3Months.map(m => {
            const lastYearDateStr = format(subMonths(parseISO(m.rawDate + "01"), 12), "yyyyMM");
            const match = history.find(h => h.rawDate === lastYearDateStr);
            return match ? match.sales : 0;
        });

        const lastYearSalesSum = lastYearSalesValues.reduce((a, b) => a + b, 0);

        if (lastYearSalesSum > 0) {
            growthFactor = last3Sales / lastYearSalesSum;
            // Limit growth factor to avoid explosions (e.g., max 50% growth projected purely automatically)
            // Clamp between 0.5 (-50%) and 2.0 (+100%)
            growthFactor = Math.max(0.5, Math.min(2.0, growthFactor));
        }
    }

    const forecast: MonthlySales[] = [];
    const today = new Date();

    for (let i = 1; i <= monthsToForecast; i++) {
        const futureDate = addMonths(today, i);
        const sameMonthLastYearStr = format(subMonths(futureDate, 12), "yyyyMM");
        const historicalMatch = history.find(h => h.rawDate === sameMonthLastYearStr);

        let predictedSales = 0;

        if (historicalMatch) {
            // Temos dados do ano passado! Usamos o algoritmo Híbrido.

            // A: Projeção baseada puramente no histórico ajustado pelo crescimento da empresa
            const historicalProjection = historicalMatch.sales * growthFactor;

            // B: Projeção baseada puramente na média recente (estável)
            const recentProjection = recentTrendAvg;

            // Mix ponderado
            predictedSales = (recentProjection * FORECAST_WEIGHTS.RECENT) +
                (historicalProjection * FORECAST_WEIGHTS.HISTORY);

        } else {
            // Produto novo ou sem histórico de 1 ano: Baseia-se apenas na tendência recente
            predictedSales = recentTrendAvg;
        }

        // Ensure no negative sales
        predictedSales = Math.max(0, predictedSales);

        forecast.push({
            month: format(futureDate, "MMM", { locale: ptBR }),
            rawDate: format(futureDate, "yyyyMM"),
            sales: Math.round(predictedSales),
            revenue: 0,
            isForecast: true,
            period: format(futureDate, "MMM/yy", { locale: ptBR }), // Added to satisfy interface
            dateStr: format(futureDate, "yyyy-MM-dd")               // Added to satisfy interface
        });
    }

    return forecast;
}
