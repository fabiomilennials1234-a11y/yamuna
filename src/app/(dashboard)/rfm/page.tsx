import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { fetchRFMData } from "@/app/rfm-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Force dynamic rendering because this page makes API calls
export const dynamic = 'force-dynamic';


export default async function RFMPage() {
    const rfmData = await fetchRFMData(12);

    // Get segment colors
    const getScoreColor = (score: number) => {
        if (score === 4) return "bg-emerald-500/20 text-emerald-400";
        if (score === 3) return "bg-blue-500/20 text-blue-400";
        if (score === 2) return "bg-yellow-500/20 text-yellow-400";
        return "bg-red-500/20 text-red-400";
    };

    return (
        <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
            <div className="flex items-center justify-between py-6">
                <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
                    RFM - Análise de Clientes
                </h2>
                <div className="flex items-center space-x-2">
                    <DateRangeFilter />
                </div>
            </div>

            <main className="space-y-6 overflow-y-auto w-full max-w-[1600px] mx-auto relative">

                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

                {/* Filters */}
                <div className="flex gap-4 flex-wrap relative z-10">
                    <select className="bg-[#0B0B1E]/80 border border-white/10 rounded-lg px-4 py-2 text-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none backdrop-blur-md">
                        <option value="">UF (Todos)</option>
                        <option value="SP">São Paulo</option>
                        <option value="RJ">Rio de Janeiro</option>
                        <option value="MG">Minas Gerais</option>
                    </select>
                    <select className="bg-[#0B0B1E]/80 border border-white/10 rounded-lg px-4 py-2 text-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none backdrop-blur-md">
                        <option value="">Recência (Todos)</option>
                        <option value="4">Score 4 (Recente)</option>
                        <option value="3">Score 3</option>
                        <option value="2">Score 2</option>
                        <option value="1">Score 1 (Antigo)</option>
                    </select>
                    <select className="bg-[#0B0B1E]/80 border border-white/10 rounded-lg px-4 py-2 text-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none backdrop-blur-md">
                        <option value="">Frequência (Todos)</option>
                        <option value="4">Score 4 (Alta)</option>
                        <option value="3">Score 3</option>
                        <option value="2">Score 2</option>
                        <option value="1">Score 1 (Baixa)</option>
                    </select>
                    <select className="bg-[#0B0B1E]/80 border border-white/10 rounded-lg px-4 py-2 text-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none backdrop-blur-md">
                        <option value="">Monetário (Todos)</option>
                        <option value="4">Score 4 (Alto)</option>
                        <option value="3">Score 3</option>
                        <option value="2">Score 2</option>
                        <option value="1">Score 1 (Baixo)</option>
                    </select>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                    <Card className="p-5">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-slate-400 text-xs uppercase tracking-wider">Total Clientes</p>
                            <div className="p-1.5 bg-indigo-500/10 rounded text-indigo-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </div>
                        </div>
                        <p className="text-white text-3xl font-bold">{rfmData.length}</p>
                    </Card>

                    <Card className="p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                        <div className="relative z-10">
                            <p className="text-xs uppercase tracking-wider mb-2 font-medium text-muted-foreground">Campeões (555)</p>
                            <p className="text-2xl font-bold text-emerald-400">
                                {rfmData.filter(c => c.R >= 3 && c.F >= 3 && c.M >= 3).length}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">R≥3, F≥3, M≥3</p>
                        </div>
                    </Card>

                    <Card className="p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                        <div className="relative z-10">
                            <p className="text-xs uppercase tracking-wider mb-2 font-medium text-muted-foreground">Em Risco (R≤2)</p>
                            <p className="text-2xl font-bold text-amber-400">
                                {rfmData.filter(c => c.R <= 2 && c.F >= 2).length}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">R≤2, F≥2</p>
                        </div>
                    </Card>

                    <Card className="p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
                        <div className="relative z-10">
                            <p className="text-xs uppercase tracking-wider mb-2 font-medium text-muted-foreground">Hibernando (R=1, F=1)</p>
                            <p className="text-2xl font-bold text-rose-400">
                                {rfmData.filter(c => c.R === 1 && c.F === 1).length}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">R=1, F=1</p>
                        </div>
                    </Card>
                </div>

                {/* RFM Table */}
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0B0B1E]/60 backdrop-blur-md shadow-2xl z-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />

                    <div className="p-6 border-b border-white/5 bg-slate-900/20 relative z-10 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            Clientes RFM
                            <span className="text-xs font-normal text-slate-400 bg-white/5 px-2 py-0.5 rounded ml-2">Últimos 12 meses</span>
                        </h3>
                    </div>

                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-[#050510]/80 text-slate-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left">Nome do Cliente</th>
                                    <th className="px-6 py-4 text-left">Email</th>
                                    <th className="px-6 py-4 text-right">Recência</th>
                                    <th className="px-6 py-4 text-right">Frequência</th>
                                    <th className="px-6 py-4 text-right">Total Gasto</th>
                                    <th className="px-6 py-4 text-right">Ticket Médio</th>
                                    <th className="px-6 py-4 text-center">R</th>
                                    <th className="px-6 py-4 text-center">F</th>
                                    <th className="px-6 py-4 text-center">M</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {rfmData.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                                            Nenhum cliente encontrado
                                        </td>
                                    </tr>
                                ) : (
                                    rfmData.slice(0, 100).map((customer, i) => (
                                        <tr key={customer.customerId || i} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-white font-medium">
                                                {customer.customerName || 'Cliente'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                                                {customer.email || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                {customer.recency} dias
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                {customer.frequency}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">
                                                R$ {customer.monetary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-400">
                                                R$ {customer.ticketAvg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded font-bold text-xs shadow-sm ${getScoreColor(customer.R)}`}>
                                                    {customer.R}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded font-bold text-xs shadow-sm ${getScoreColor(customer.F)}`}>
                                                    {customer.F}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded font-bold text-xs shadow-sm ${getScoreColor(customer.M)}`}>
                                                    {customer.M}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {rfmData.length > 100 && (
                        <div className="p-4 border-t border-white/5 text-center text-slate-400 text-sm bg-[#050510]/30">
                            Mostrando 100 de {rfmData.length} clientes
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="bg-[#0B0B1E]/60 border border-white/5 rounded-xl p-6 relative z-10 backdrop-blur-md">
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                        Legenda RFM
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div className="bg-slate-900/40 p-3 rounded-lg border border-white/5">
                            <p className="text-indigo-400 font-bold mb-1 uppercase text-xs tracking-wider">R - Recência</p>
                            <p className="text-slate-400">Dias desde a última compra. <br /><span className="text-white font-medium">Menor = Melhor (Score 4)</span></p>
                        </div>
                        <div className="bg-slate-900/40 p-3 rounded-lg border border-white/5">
                            <p className="text-indigo-400 font-bold mb-1 uppercase text-xs tracking-wider">F - Frequência</p>
                            <p className="text-slate-400">Total de compras realizadas. <br /><span className="text-white font-medium">Maior = Melhor (Score 4)</span></p>
                        </div>
                        <div className="bg-slate-900/40 p-3 rounded-lg border border-white/5">
                            <p className="text-indigo-400 font-bold mb-1 uppercase text-xs tracking-wider">M - Monetário</p>
                            <p className="text-slate-400">Total gasto pelo cliente. <br /><span className="text-white font-medium">Maior = Melhor (Score 4)</span></p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
