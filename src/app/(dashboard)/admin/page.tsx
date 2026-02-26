import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowRight, Building2, Plus, Users, ShieldAlert, Settings } from "lucide-react";
import { switchTenantContext } from "./actions";
import { AgencyHeaderActions } from "@/components/agency/AgencyHeaderActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

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

    // 3. Fetch Data
    const { data: tenants } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

    // 4. Count users per tenant
    const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .not('tenant_id', 'is', null);

    const userCountMap = new Map<string, number>();
    let totalUsersCount = 0;
    userProfiles?.forEach(p => {
        if (p.tenant_id) {
            userCountMap.set(p.tenant_id, (userCountMap.get(p.tenant_id) || 0) + 1);
            totalUsersCount++;
        }
    });

    const totalTenants = tenants?.length || 0;

    return (
        <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
            {/* Header */}
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
                        <div className="text-2xl font-bold">{totalUsersCount}</div>
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
                    {tenants?.map((tenant) => {
                        const userCount = userCountMap.get(tenant.id) || 0;
                        return (
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
                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-emerald-500/10 text-emerald-500">
                                            Ativo
                                        </span>
                                    </div>

                                    <h3 className="font-semibold leading-none tracking-tight mb-1">{tenant.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {userCount} {userCount === 1 ? 'usuário' : 'usuários'}
                                    </p>

                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <Link
                                            href={`/admin/${tenant.id}`}
                                            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Settings className="mr-1.5 h-3.5 w-3.5" />
                                            Gerenciar
                                        </Link>

                                        <form action={async () => {
                                            "use server";
                                            await switchTenantContext(tenant.id);
                                        }}>
                                            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-9 px-3 group-hover:text-primary">
                                                Acessar Painel <ArrowRight className="ml-2 h-4 w-4" />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add New Card — placeholder, AgencyHeaderActions handles the real modal */}
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] border-2 border-dashed rounded-xl text-muted-foreground">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                            <Plus className="h-5 w-5" />
                        </div>
                        <span className="font-medium text-sm">Use &quot;Novo Cliente&quot; acima</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
