"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchEmailSmsData } from "@/app/ga4-actions";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, DollarSign, MousePointerClick, ShoppingCart, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmailSmsAnalysisProps {
    startDate?: string;
    endDate?: string;
}

export function EmailSmsAnalysis({ startDate = "30daysAgo", endDate = "today" }: EmailSmsAnalysisProps) {
    const [loading, setLoading] = React.useState(true);
    const [data, setData] = React.useState<any>(null);
    const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'revenue', direction: 'desc' });

    React.useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const result = await fetchEmailSmsData(startDate, endDate);
                setData(result);
            } catch (error) {
                console.error("Failed to load Email/SMS data", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [startDate, endDate]);

    const handleSort = (key: string) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
        }));
    };

    const sortedCampaigns = React.useMemo(() => {
        if (!data?.campaigns) return [];
        return [...data.campaigns].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (typeof aValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [data, sortConfig]);

    if (loading) {
        return (
            <Card className="col-span-1 xl:col-span-2 min-h-[300px] flex items-center justify-center">
                <LoadingSpinner />
            </Card>
        );
    }

    if (!data || !data.campaigns || data.campaigns.length === 0) {
        return (
            <Card className="col-span-1 xl:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-500" />
                        Email & SMS Marketing (Edrone)
                    </CardTitle>
                    <CardDescription>Receita gerada por automações e campanhas</CardDescription>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado encontrado para o período.
                </CardContent>
            </Card>
        );
    }

    const { totals } = data;
    const conversionRate = totals.sessions > 0 ? (totals.purchases / totals.sessions) * 100 : 0;

    return (
        <Card className="col-span-1 xl:col-span-2">
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-500" />
                            Email & SMS Marketing (Edrone)
                        </CardTitle>
                        <CardDescription>
                            Performance de campanhas e automações
                        </CardDescription>
                    </div>
                    {/* Summary Badges */}
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="px-3 py-1 flex gap-2 items-center">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            <span className="font-mono font-bold text-green-600">
                                {totals.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                        </Badge>
                        <Badge variant="outline" className="px-3 py-1 flex gap-2 items-center">
                            <ShoppingCart className="w-4 h-4 text-purple-500" />
                            <span>{totals.purchases} pedidos</span>
                        </Badge>
                        <Badge variant="outline" className="px-3 py-1 flex gap-2 items-center">
                            <MousePointerClick className="w-4 h-4 text-orange-500" />
                            <span>{conversionRate.toFixed(2)}% conv.</span>
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">Campanha / Fonte</TableHead>
                                <TableHead onClick={() => handleSort('medium')} className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-1">Canal <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('sessions')} className="text-right cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-end gap-1">Sessões <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('purchases')} className="text-right cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-end gap-1">Pedidos <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('conversionRate')} className="text-right cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-end gap-1">Conv. % <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('revenue')} className="text-right cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-end gap-1">Receita <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedCampaigns.map((row: any, i: number) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="truncate max-w-[280px]" title={row.campaign === '(not set)' ? row.source : row.campaign}>
                                                {row.campaign === '(not set)' ? row.source : row.campaign}
                                            </span>
                                            {row.campaign !== '(not set)' && row.source !== 'edrone' && (
                                                <span className="text-xs text-muted-foreground">{row.source}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs uppercase">
                                            {row.medium.toLowerCase().includes('email') ? (
                                                <><Mail className="w-3 h-3 mr-1" /> Email</>
                                            ) : (row.medium.toLowerCase().includes('sms') || row.source.toLowerCase().includes('sms')) ? (
                                                <><MessageSquare className="w-3 h-3 mr-1" /> SMS</>
                                            ) : row.medium}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{row.sessions.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{row.purchases}</TableCell>
                                    <TableCell className="text-right">{row.conversionRate.toFixed(2)}%</TableCell>
                                    <TableCell className="text-right font-bold text-green-600">
                                        {row.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
