import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { fetchSourceMediumData } from "@/app/ga4-actions";
import { formatDuration } from "@/lib/services/ga4-reports";

// Enable ISR with 5 minute revalidation
export const revalidate = 300;

interface Props {
    searchParams: Promise<{ start?: string; end?: string }>;
}

export default async function OrigemMidiaPage(props: Props) {
    const searchParams = await props.searchParams;
    const startDate = searchParams.start || "30daysAgo";
    const endDate = searchParams.end || "today";

    const data = await fetchSourceMediumData(startDate, endDate);

    if (!data) {
        return (
            <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
                <div className="flex items-center justify-between py-6">
                    <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
                        Origem/Mídia (GA4)
                    </h2>
                    <div className="flex items-center space-x-2">
                        <DateRangeFilter />
                    </div>
                </div>
                <main className="p-6">
                    <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
                        <p className="text-red-400">Erro ao carregar dados do GA4</p>
                        <p className="text-red-500 text-sm mt-2">Verifique as credenciais do Google Analytics</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
            <div className="flex items-center justify-between py-6">
                <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
                    Origem/Mídia (GA4)
                </h2>
                <div className="flex items-center space-x-2">
                    <DateRangeFilter />
                </div>
            </div>

            <main className="space-y-6 overflow-y-auto w-full">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <p className="text-slate-400 text-sm mb-1">Sessões</p>
                        <p className="text-white text-2xl font-bold">
                            {data.totals.sessions.toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <p className="text-slate-400 text-sm mb-1">Add ao Carrinho</p>
                        <p className="text-white text-2xl font-bold">
                            {data.totals.addToCarts.toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <p className="text-slate-400 text-sm mb-1">Compras</p>
                        <p className="text-white text-2xl font-bold">
                            {data.totals.purchases.toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-xl p-4">
                        <p className="text-emerald-300 text-sm mb-1">Receita</p>
                        <p className="text-white text-2xl font-bold">
                            R$ {data.totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <p className="text-slate-400 text-sm mb-1">Taxa Conversão</p>
                        <p className="text-white text-2xl font-bold">
                            {data.totals.conversionRate.toFixed(2)}%
                        </p>
                    </div>
                </div>

                {/* Source/Medium Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white">Origem / Mídia por Página de Destino</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">Origem / Mídia</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">Página de destino</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Sessões</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">% Δ</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Add Carrinho</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Compras</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Receita</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">% Δ</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Tx Conv.</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Receita média</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Duração média</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                {data.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                                            Nenhum dado encontrado para o período
                                        </td>
                                    </tr>
                                ) : (
                                    data.data.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-800/50">
                                            <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                                                {row.source} / {row.medium}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate" title={row.landingPage}>
                                                {row.landingPage}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {row.sessions.toLocaleString('pt-BR')}
                                            </td>
                                            <td className={`px-4 py-3 text-right text-xs ${row.sessionsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {row.sessionsChange !== 0 ? `${row.sessionsChange > 0 ? '↑' : '↓'} ${Math.abs(row.sessionsChange)}%` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {row.addToCarts}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold">
                                                {row.purchases}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                                {row.revenue > 0
                                                    ? `R$ ${row.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                    : '-'
                                                }
                                            </td>
                                            <td className={`px-4 py-3 text-right text-xs ${row.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {row.revenueChange !== 0 ? `${row.revenueChange > 0 ? '↑' : '↓'} ${Math.abs(row.revenueChange)}%` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {row.conversionRate.toFixed(2)}%
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {row.avgRevenue > 0
                                                    ? `R$ ${row.avgRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                    : '-'
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-400">
                                                {formatDuration(row.avgSessionDuration)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-3 border-t border-slate-800 flex items-center justify-between text-slate-500 text-xs">
                        <span>Mostrando {Math.min(data.data.length, 50)} de {data.data.length} combinações</span>
                        <div className="flex gap-2">
                            <button className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700" disabled>
                                ← Anterior
                            </button>
                            <button className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700" disabled>
                                Próximo →
                            </button>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-white font-semibold mb-3">Sobre os Dados</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-slate-400 font-medium mb-1">Origem / Mídia</p>
                            <p className="text-slate-500">
                                Combinação de fonte (google, facebook, direct) com tipo de mídia (cpc, organic, referral)
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-400 font-medium mb-1">Taxa de Conversão</p>
                            <p className="text-slate-500">
                                Compras / Sessões × 100 (conforme PDF)
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
