import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Building2, Users, ArrowRight, Plus } from "lucide-react";
import { switchTenantContext } from "./actions";

import { AgencyHeaderActions } from "@/components/agency/AgencyHeaderActions";
import Link from "next/link";

export default async function AgencyPortalPage() {
    const supabase = await createClient();

    // 1. Verify Authentication & Role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'super_admin') {
        redirect("/dashboard"); // Kick out non-admins
    }

    // 2. Fetch Tenants
    const { data: tenants } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Building2 className="text-indigo-400" size={32} />
                        Portal da Agência
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Gerencie todos os acessos e clientes da Milennials
                    </p>
                </div>
                <AgencyHeaderActions />
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Total de Clientes</p>
                            <p className="text-2xl font-bold text-white">{tenants?.length || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Usuários Ativos</p>
                            <p className="text-2xl font-bold text-white">1</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Clients Grid */}
            <h2 className="text-xl font-semibold text-white mb-6">Clientes Ativos</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tenants?.map((tenant) => (
                    <div key={tenant.id} className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 relative overflow-hidden">

                        <div className="flex items-start justify-between mb-6">
                            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                                {tenant.logo_url ? (
                                    <img src={tenant.logo_url} alt={tenant.name} className="w-8 h-8 object-contain" />
                                ) : (
                                    <span className="text-lg font-bold text-slate-500">{tenant.name.substring(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded border border-emerald-500/20">
                                ATIVO
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                            {tenant.name}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            slug: {tenant.slug}
                        </p>



                        <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                            <div className="flex -space-x-2">
                                {/* Mock Users */}
                                <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs text-slate-300">C</div>
                            </div>

                            <form action={async () => {
                                "use server";
                                await switchTenantContext(tenant.id);
                            }}>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 text-sm font-medium text-slate-300 group-hover:text-indigo-400 transition-colors"
                                >
                                    Acessar Painel
                                    <ArrowRight size={16} />
                                </button>
                            </form>
                        </div>
                    </div>
                ))}

                {/* Empty State / Add New */}
                <button className="flex flex-col items-center justify-center h-full min-h-[240px] border-2 border-dashed border-slate-800 rounded-xl hover:border-indigo-500/50 hover:bg-slate-900/50 transition-all group text-slate-500 hover:text-white">
                    <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors duration-300">
                        <Plus size={24} />
                    </div>
                    <span className="font-medium">Adicionar Novo Cliente</span>
                </button>
            </div>
        </div>
    );
}
