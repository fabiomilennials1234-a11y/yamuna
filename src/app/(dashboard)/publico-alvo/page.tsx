import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { fetchDemographicsData } from "@/app/ga4-actions";

// Enable ISR with 5 minute revalidation
export const revalidate = 300;

interface Props {
    searchParams: Promise<{ start?: string; end?: string }>;
}

export default async function PublicoAlvoPage(props: Props) {
    const searchParams = await props.searchParams;
    const startDate = searchParams.start || "30daysAgo";
    const endDate = searchParams.end || "today";

    const data = await fetchDemographicsData(startDate, endDate);

    if (!data) {
        return (
            <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
                <div className="flex items-center justify-between py-6">
                    <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
                        Público-alvo (GA4)
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
                    Público-alvo (GA4)
                </h2>
                <div className="flex items-center space-x-2">
                    <DateRangeFilter />
                </div>
            </div>

            <main className="space-y-6 overflow-y-auto w-full">
                {/* Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <p className="text-slate-400 text-sm mb-1">Sessões Totais</p>
                        <p className="text-white text-2xl font-bold">
                            {data.totals.sessions.toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <p className="text-slate-400 text-sm mb-1">Compras</p>
                        <p className="text-white text-2xl font-bold">
                            {data.totals.purchases.toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <p className="text-slate-400 text-sm mb-1">Receita</p>
                        <p className="text-emerald-400 text-2xl font-bold">
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Regions Table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white">Região</h3>
                        </div>
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-950 text-slate-400 text-xs uppercase sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Região</th>
                                        <th className="px-4 py-3 text-right">Sessões</th>
                                        <th className="px-4 py-3 text-right">% Δ</th>
                                        <th className="px-4 py-3 text-right">Compras</th>
                                        <th className="px-4 py-3 text-right">Receita</th>
                                        <th className="px-4 py-3 text-right">Tx Conv.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-slate-300">
                                    {data.regions.map((region, i) => (
                                        <tr key={i} className="hover:bg-slate-800/50">
                                            <td className="px-4 py-3 text-white font-medium">
                                                {region.region}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {region.sessions.toLocaleString('pt-BR')}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-500">-</td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {region.purchases}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                                R$ {region.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {region.conversionRate.toFixed(2)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-950 text-white font-bold">
                                    <tr>
                                        <td className="px-4 py-3">Total geral</td>
                                        <td className="px-4 py-3 text-right">{data.totals.sessions.toLocaleString('pt-BR')}</td>
                                        <td className="px-4 py-3 text-right">-</td>
                                        <td className="px-4 py-3 text-right">{data.totals.purchases}</td>
                                        <td className="px-4 py-3 text-right text-emerald-400">R$ {data.totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-right">{data.totals.conversionRate.toFixed(2)}%</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="p-2 border-t border-slate-800 text-center text-slate-500 text-xs">
                            1 - {Math.min(data.regions.length, 100)} / {data.regions.length}
                        </div>
                    </div>

                    {/* Cities Table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white">Cidade</h3>
                        </div>
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-950 text-slate-400 text-xs uppercase sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Cidade</th>
                                        <th className="px-4 py-3 text-right">Sessões</th>
                                        <th className="px-4 py-3 text-right">% Δ</th>
                                        <th className="px-4 py-3 text-right">Compras</th>
                                        <th className="px-4 py-3 text-right">Receita</th>
                                        <th className="px-4 py-3 text-right">Tx Conv.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-slate-300">
                                    {data.cities.map((city, i) => (
                                        <tr key={i} className="hover:bg-slate-800/50">
                                            <td className="px-4 py-3 text-white font-medium">
                                                {city.city}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {city.sessions.toLocaleString('pt-BR')}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-500">-</td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {city.purchases}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                                R$ {city.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {city.conversionRate.toFixed(2)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 border-t border-slate-800 text-center text-slate-500 text-xs">
                            1 - {Math.min(data.cities.length, 100)} / {data.cities.length}
                        </div>
                    </div>
                </div>

                {/* Age Groups Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white">Idade</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left">Idade</th>
                                    <th className="px-4 py-3 text-right">Sessões</th>
                                    <th className="px-4 py-3 text-right">Compras GA4</th>
                                    <th className="px-4 py-3 text-right">Receita</th>
                                    <th className="px-4 py-3 text-right">Tx Conversão</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                {data.ageGroups.map((age, i) => (
                                    <tr key={i} className="hover:bg-slate-800/50">
                                        <td className="px-4 py-3 text-white font-medium">
                                            {age.age}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {age.sessions.toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {age.purchases}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                            R$ {age.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {age.conversionRate.toFixed(2)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-2 border-t border-slate-800 text-center text-slate-500 text-xs">
                        1 - {data.ageGroups.length} / {data.ageGroups.length}
                    </div>
                </div>
            </main>
        </div>
    );
}
