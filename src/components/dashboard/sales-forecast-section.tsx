"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { fetchProductAnalysis, fetchSimpleProductList } from "@/app/products-actions"; // Fixed import
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";

const chartConfig = {
    history: {
        label: "Histórico",
        color: "hsl(217 91% 60%)", // Vibrant Blue
    },
    forecast: {
        label: "Previsão",
        color: "hsl(270 95% 65%)", // Vibrant Purple
    },
};

export function SalesForecastSection() {
    const [mount, setMount] = React.useState(false);

    // Start as false. We only load when we have a product.
    const [loading, setLoading] = React.useState(false);
    const [data, setData] = React.useState<any>(null);
    const [product, setProduct] = React.useState<string>("");
    const [productList, setProductList] = React.useState<any[]>([]);

    React.useEffect(() => {
        setMount(true);
        async function loadProducts() {
            try {
                // Use Simple List (Fast)
                const list = await fetchSimpleProductList(30);

                setProductList(list);
                if (list.length > 0) setProduct(list[0].name);
            } catch (err) {
                console.error("Failed to load product list for forecast", err);
            }
        }
        loadProducts();
    }, []);

    React.useEffect(() => {
        if (!product) return;
        async function loadAnalysis() {
            setLoading(true);
            try {
                // Find ID? Analysis needs ID for stock.
                const pObj = productList.find(p => p.name === product);
                const id = pObj?.code || "";

                const result = await fetchProductAnalysis(id, product);
                setData(result);
            } catch (err) {
                console.error(err);
                setData(null);
            } finally {
                setLoading(false);
            }
        }
        loadAnalysis();
    }, [product, productList]);

    // Transform data for split chart (History vs Forecast)
    const chartData = React.useMemo(() => {
        if (!data?.chartData) return [];

        // Find the index of the last history item (last non-forecast item)
        const transitionIndex = data.chartData.findLastIndex((d: any) => !d.isForecast);

        return data.chartData.map((d: any, i: number) => {
            const isHistory = !d.isForecast;

            // History series: Include all history points
            let historyVal = isHistory ? d.sales : undefined;

            // Forecast series: Include all forecast points AND the transition point (last history point)
            // This ensures the line connects visually from the last history point to the first forecast point.
            let forecastVal = d.isForecast ? d.sales : undefined;

            if (i === transitionIndex && transitionIndex !== -1) {
                // This is the "bridge" point. It belongs to history, but we also give it to forecast 
                // so the forecast line starts here.
                forecastVal = d.sales;
            }

            return {
                period: d.period || d.month,
                history: historyVal,
                forecast: forecastVal,
                ...d
            };
        });
    }, [data]);

    if (!mount) return null;

    return (
        <Card className="col-span-full xl:col-span-4 h-full">
            <CardHeader className="flex flex-col sm:flex-row items-center justify-between space-y-2 pb-2">
                <div className="space-y-1 text-center sm:text-left">
                    <CardTitle>Previsão de Estoque e Demanda</CardTitle>
                    <CardDescription>
                        Projeção de vendas para os próximos meses
                    </CardDescription>
                </div>
                <Select value={product} onValueChange={setProduct}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Selecione Produto" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {productList.map((p, i) => (
                            <SelectItem key={i + p.code} value={p.name}>
                                {p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                {loading || !data ? (
                    <div className="h-[250px] flex items-center justify-center">
                        <LoadingSpinner className="w-8 h-8" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* KPIs */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-2 border rounded-lg bg-card/50">
                                <p className="text-xs text-muted-foreground uppercase">Média Mensal</p>
                                <p className="text-xl font-bold">{data.avgMonthlySales} <span className="text-xs font-normal">un</span></p>
                            </div>
                            <div className="p-2 border rounded-lg bg-card/50">
                                <p className="text-xs text-muted-foreground uppercase">Estoque Atual</p>
                                <p className="text-xl font-bold">{data.stock} <span className="text-xs font-normal">un</span></p>
                            </div>
                            <div className="p-2 border rounded-lg bg-card/50">
                                <p className="text-xs text-muted-foreground uppercase">Cobertura</p>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="text-xl font-bold">{data.stockCoverageDays} <span className="text-xs font-normal">dias</span></p>
                                    <Badge variant={data.stockStatus === 'critical' ? 'destructive' : data.stockStatus === 'warning' ? 'secondary' : 'default'} className="h-5 text-[10px]">
                                        {data.stockStatus === 'critical' ? 'Crítico' : data.stockStatus === 'warning' ? 'Atenção' : 'OK'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Chart */}
                        {/* Chart */}
                        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="fillHistory" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-history)" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="var(--color-history)" stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="fillForecast" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-forecast)" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="var(--color-forecast)" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                <XAxis
                                    dataKey="period"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis tickLine={false} axisLine={false} hide />
                                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />

                                <Area
                                    type="natural"
                                    dataKey="history"
                                    name="Histórico"
                                    stroke="var(--color-history)"
                                    fill="url(#fillHistory)"
                                    strokeWidth={3}
                                    stackId="a"
                                />
                                <Area
                                    type="natural"
                                    dataKey="forecast"
                                    name="Previsão"
                                    stroke="var(--color-forecast)"
                                    fill="url(#fillForecast)"
                                    strokeWidth={3}
                                    strokeDasharray="4 4"
                                    stackId="a"
                                />
                            </AreaChart>
                        </ChartContainer>

                        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground text-center">
                            <p>* Projeção Inteligente: 60% Tendência Recente + 40% Sazonalidade (Ano Anterior).</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
