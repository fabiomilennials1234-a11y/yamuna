"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface MonthComparisonProps {
    currentMonth: {
        month: number;
        year: number;
        revenue: number;
        transactions: number;
        investment: number;
        projectedRevenue: number;
        goal: any;
        revenueGoalPercent: number;
    };
    previousMonth: {
        month: number;
        year: number;
        revenue: number;
        transactions: number;
        investment: number;
        goal: any;
        revenueGoalPercent: number;
    };
}

export function MonthComparison({ currentMonth, previousMonth }: MonthComparisonProps) {
    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const revenueChange = previousMonth.revenue > 0
        ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100
        : 0;

    const investmentChange = previousMonth.investment > 0
        ? ((currentMonth.investment - previousMonth.investment) / previousMonth.investment) * 100
        : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
            {/* Current Month */}
            <div className="bg-[#0B0B1E]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

                <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider pl-2 border-l-4 border-purple-500">
                    {monthNames[currentMonth.month - 1]} {currentMonth.year} <span className="text-purple-400 text-sm normal-case opacity-70 ml-2">(Atual)</span>
                </h3>

                <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <span className="text-slate-400 text-sm uppercase tracking-wide">Receita Faturada</span>
                        <span className="text-white text-xl font-bold">
                            R$ {currentMonth.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <span className="text-slate-400 text-sm uppercase tracking-wide">Meta Mensal</span>
                        <span className="text-white text-xl font-bold">
                            {currentMonth.goal?.revenue_goal
                                ? `R$ ${currentMonth.goal.revenue_goal.toLocaleString('pt-BR')}`
                                : "Não definida"
                            }
                        </span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <span className="text-indigo-300 text-sm uppercase tracking-wide">Projeção R$</span>
                        <span className="text-indigo-300 text-xl font-bold">
                            R$ {currentMonth.projectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                        <span className="text-orange-300 text-sm uppercase tracking-wide">Projeção %</span>
                        <span className="text-orange-300 text-xl font-bold">
                            {currentMonth.revenueGoalPercent.toFixed(1)}%
                        </span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <span className="text-slate-400 text-sm uppercase tracking-wide">Investimento</span>
                        <div className="text-right">
                            <span className="text-white text-xl font-bold block">
                                R$ {currentMonth.investment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            {investmentChange !== 0 && (
                                <span className={`text-[10px] flex items-center gap-1 justify-end mt-1 font-bold uppercase tracking-wide ${investmentChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {investmentChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {Math.abs(investmentChange).toFixed(1)}% vs mês anterior
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <span className="text-slate-400 text-sm uppercase tracking-wide">Transações</span>
                        <span className="text-white text-xl font-bold">
                            {currentMonth.transactions.toLocaleString('pt-BR')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Previous Month */}
            <div className="bg-[#0B0B1E]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

                <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider pl-2 border-l-4 border-blue-500">
                    {monthNames[previousMonth.month - 1]} {previousMonth.year} <span className="text-blue-400 text-sm normal-case opacity-70 ml-2">(Anterior)</span>
                </h3>

                <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <span className="text-slate-400 text-sm uppercase tracking-wide">Receita</span>
                        <div className="text-right">
                            <span className="text-white text-xl font-bold block">
                                R$ {previousMonth.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            {revenueChange !== 0 && (
                                <span className={`text-[10px] flex items-center gap-1 justify-end mt-1 font-bold uppercase tracking-wide ${revenueChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {revenueChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {Math.abs(revenueChange).toFixed(1)}% crescimento
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <span className="text-slate-400 text-sm uppercase tracking-wide">Meta Anterior</span>
                        <span className="text-white text-xl font-bold">
                            {previousMonth.goal?.revenue_goal
                                ? `R$ ${previousMonth.goal.revenue_goal.toLocaleString('pt-BR')}`
                                : "Não definida"
                            }
                        </span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <span className="text-slate-400 text-sm uppercase tracking-wide">Investimento</span>
                        <span className="text-white text-xl font-bold">
                            R$ {previousMonth.investment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className={`flex justify-between items-center p-4 rounded-xl border hover:brightness-110 transition-all ${previousMonth.revenueGoalPercent >= 100
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-white/5 border-white/5'
                        }`}>
                        <span className={`text-sm uppercase tracking-wide ${previousMonth.revenueGoalPercent >= 100 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                            % Meta Atingida
                        </span>
                        <span className={`text-xl font-bold ${previousMonth.revenueGoalPercent >= 100 ? 'text-emerald-300' : 'text-white'
                            }`}>
                            {previousMonth.revenueGoalPercent.toFixed(1)}%
                        </span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <span className="text-slate-400 text-sm uppercase tracking-wide">Transações</span>
                        <span className="text-white text-xl font-bold">
                            {previousMonth.transactions.toLocaleString('pt-BR')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
