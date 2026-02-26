import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Building2, Globe, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantUsersList } from "@/components/admin/TenantUsersList";
import Link from "next/link";

interface PageProps {
    params: Promise<{ tenantId: string }>;
}

export default async function TenantDetailPage({ params }: PageProps) {
    const { tenantId } = await params;
    const supabase = await createClient();

    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // 2. Authorize — super admin only
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.role === 'super_admin' || user.email === 'caiomilennials@gmail.com';
    if (!isSuperAdmin) notFound();

    // 3. Fetch tenant data
    const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

    if (tenantError || !tenant) notFound();

    // 4. Fetch tenant users using service role (to get email from auth.users)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    let users: Array<{
        id: string;
        email: string;
        full_name: string | null;
        role: string;
        created_at: string;
    }> = [];

    if (serviceKey && supabaseUrl) {
        const admin = createServiceClient(supabaseUrl, serviceKey);

        // Get user_profiles for this tenant
        const { data: profiles } = await admin
            .from('user_profiles')
            .select('id, full_name, role, created_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (profiles && profiles.length > 0) {
            // Get emails from auth.users for each profile
            const { data: authUsers } = await admin.auth.admin.listUsers({
                perPage: 1000,
            });

            const emailMap = new Map<string, string>();
            authUsers?.users?.forEach(u => {
                emailMap.set(u.id, u.email || '');
            });

            users = profiles.map(p => ({
                id: p.id,
                email: emailMap.get(p.id) || '',
                full_name: p.full_name,
                role: p.role,
                created_at: p.created_at,
            }));
        }
    }

    // 5. Modules info
    const modules = (tenant.modules as string[]) || [];

    return (
        <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
            {/* Back + Header */}
            <div className="py-6">
                <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                    <ArrowLeft size={16} />
                    Voltar ao Painel Admin
                </Link>

                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center border">
                        {tenant.logo_url ? (
                            <img src={tenant.logo_url} alt={tenant.name} className="h-10 w-10 object-contain" />
                        ) : (
                            <span className="text-xl font-bold text-muted-foreground">
                                {tenant.name.substring(0, 2).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-3xl font-semibold tracking-tight">{tenant.name}</h2>
                        <p className="text-muted-foreground text-sm">/{tenant.slug}</p>
                    </div>
                </div>
            </div>

            {/* Tenant Info Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuários</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.length}</div>
                        <p className="text-xs text-muted-foreground">vinculados a esta organização</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Módulos Ativos</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{modules.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {modules.length > 0 ? modules.join(', ') : 'Nenhum módulo configurado'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Criado em</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Users Section */}
            <TenantUsersList
                users={users}
                tenantId={tenantId}
                tenantName={tenant.name}
            />
        </div>
    );
}
