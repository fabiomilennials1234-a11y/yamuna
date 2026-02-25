import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowRight, Building2, Plus, Users, ShieldAlert } from "lucide-react";
import { switchTenantContext } from "./actions";
import { AgencyHeaderActions } from "@/components/agency/AgencyHeaderActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
    const supabase = await createClient();

    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // 2. Authorize
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.role === 'super_admin' || user.email === 'caiomilennials@gmail.com';

    if (!isSuperAdmin) {
        notFound();
    }

    // 3. Fetch Data (Real Data)
    const { data: tenants } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

    // Mock stats for now until we have aggregated counts
    const totalTenants = tenants?.length || 0;
    const totalUsers = 1200; // Placeholder until we query all users

    return (
        <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
            {/* Header with improved spacing and typography */}
            <div className="flex items-center justify-between py-6">
                <div>
                    <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
                        Painel Super Admin
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Gerencie todos os clientes da agência (Milennials).
                    </p>
                </div>
                <AgencyHeaderActions />
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Clientes Ativos
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTenants}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total de Usuários
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            Em todos os tenants
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Status do Sistema
                        </CardTitle>
                        <ShieldAlert className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">Operacional</div>
                    </CardContent>
                </Card>
            </div>

            {/* Clients Grid */}
            <div className="space-y-4">
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                    Clientes Cadastrados
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tenants?.map((tenant) => (
                        <div key={tenant.id} className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-lg hover:border-primary/50">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border">
                                        {tenant.logo_url ? (
                                            <img src={tenant.logo_url} alt={tenant.name} className="h-8 w-8 object-contain" />
                                        ) : (
                                            <span className="text-lg font-bold text-muted-foreground">{tenant.name.substring(0, 2).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-emerald-500/10 text-emerald-500">
                                        Ativo
                                    </span>
                                </div>

                                <h3 className="font-semibold leading-none tracking-tight mb-2">{tenant.name}</h3>
                                <p className="text-sm text-muted-foreground mb-4">Slug: {tenant.slug}</p>

                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div className="text-xs text-muted-foreground">
                                        {/* Placeholder for tenant stats */}
                                        ID: {tenant.id.substring(0, 8)}...
                                    </div>

                                    <form action={async () => {
                                        "use server";
                                        await switchTenantContext(tenant.id);
                                    }}>
                                        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3 group-hover:text-primary">
                                            Acessar Painel <ArrowRight className="ml-2 h-4 w-4" />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add New Card */}
                    <button className="flex flex-col items-center justify-center h-full min-h-[200px] border-2 border-dashed rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Plus className="h-5 w-5" />
                        </div>
                        <span className="font-medium">Adicionar Novo Cliente</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
