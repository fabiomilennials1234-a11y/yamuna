"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface Goal {
    revenue: number;
    transactions: number;
    investment: number;
}

interface ProjectionSectionProps {
    goal: Goal | null;
    currentData: {
        revenue: number;
        transactions: number;
        avgTicket: number;
    };
}

export function ProjectionSection({ goal, currentData }: ProjectionSectionProps) {
    if (!goal) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <AlertCircle className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="text-xl font-bold mb-2">Projeção Não Disponível</h3>
                    <p className="text-muted-foreground">
                        Defina uma meta de receita, transações ou orçamento acima para ver as projeções.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const projectedRevenue = goal.revenue || currentData.revenue;
    const projectedTransactions = goal.transactions || currentData.transactions;
    const projectedInvestment = goal.investment || 0;

    const revenueProgress = currentData.revenue > 0 ? (currentData.revenue / projectedRevenue) * 100 : 0;
    const transactionsProgress = currentData.transactions > 0 ? (currentData.transactions / projectedTransactions) * 100 : 0;

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-wider uppercase text-muted-foreground">
                VISUALIZAÇÃO DO FUNIL
            </h3>

            <Card>
                <CardContent className="p-6 space-y-6">
                    {/* Revenue Progress */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Meta de Receita</span>
                            <span className="text-sm font-bold">
                                {revenueProgress.toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-500"
                                style={{ width: `${Math.min(revenueProgress, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center mt-2 text-xs">
                            <span className="text-muted-foreground">
                                R$ {currentData.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="font-medium">
                                R$ {projectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Transactions Progress */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Meta de Transações</span>
                            <span className="text-sm font-bold">
                                {transactionsProgress.toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-500"
                                style={{ width: `${Math.min(transactionsProgress, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center mt-2 text-xs">
                            <span className="text-muted-foreground">
                                {currentData.transactions} transações
                            </span>
                            <span className="font-medium">
                                {projectedTransactions} transações
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
