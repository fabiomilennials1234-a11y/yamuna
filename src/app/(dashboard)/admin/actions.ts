'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function switchTenantContext(tenantId: string) {
    const supabase = await createClient()

    // 1. Verify Authentication & Role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'super_admin' && user?.email !== 'caiomilennials@gmail.com') throw new Error("Unauthorized Access")

    // 2. Set Context Cookie
    const cookieStore = await cookies()
    cookieStore.set('active_tenant_id', tenantId, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    redirect('/dashboard')
}

export async function createTenant(formData: FormData) {
    const supabase = await createClient()

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin' && user?.email !== 'caiomilennials@gmail.com') throw new Error("Only admins can create tenants")

    // 2. Parse Data
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    if (!name) return { error: "Nome é obrigatório" };

    // 3. Insert
    const { error } = await supabase.from('tenants').insert({
        name,
        slug,
        modules: ['dashboard'] // Default module
    });

    if (error) {
        console.error("Error creating tenant:", error);
        return { error: error.message };
    }

    revalidatePath('/admin');
    return { success: true };
}
