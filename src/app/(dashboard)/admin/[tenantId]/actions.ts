'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

async function requireSuperAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'super_admin' && user?.email !== 'caiomilennials@gmail.com') {
        throw new Error('Unauthorized: Super Admin only')
    }

    return { supabase, user }
}

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
    }

    return createServiceClient(url, serviceKey)
}

export async function createUserForTenant(tenantId: string, formData: FormData) {
    await requireSuperAdmin()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const role = formData.get('role') as string

    if (!email || !password || !fullName) {
        return { error: 'Preencha todos os campos obrigatórios.' }
    }

    if (password.length < 6) {
        return { error: 'A senha deve ter no mínimo 6 caracteres.' }
    }

    if (!['client_owner', 'client_viewer'].includes(role)) {
        return { error: 'Role inválida.' }
    }

    const admin = getAdminClient()

    // 1. Create the user in auth.users (email already confirmed)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
    })

    if (authError) {
        if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
            return { error: 'Este email já está cadastrado no sistema.' }
        }
        console.error('[CreateUser] Auth error:', authError)
        return { error: 'Erro ao criar usuário: ' + authError.message }
    }

    // 2. Create/update user_profiles linked to tenant
    const { error: profileError } = await admin
        .from('user_profiles')
        .upsert({
            id: authData.user.id,
            full_name: fullName,
            tenant_id: tenantId,
            role: role,
        })

    if (profileError) {
        console.error('[CreateUser] Profile error:', profileError)
        // Rollback: delete the auth user if profile creation fails
        await admin.auth.admin.deleteUser(authData.user.id)
        return { error: 'Erro ao vincular usuário à organização.' }
    }

    revalidatePath(`/admin/${tenantId}`)
    return { success: true }
}

export async function updateUserRole(tenantId: string, userId: string, newRole: string) {
    await requireSuperAdmin()

    if (!['client_owner', 'client_viewer'].includes(newRole)) {
        return { error: 'Role inválida.' }
    }

    const admin = getAdminClient()

    const { error } = await admin
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .eq('tenant_id', tenantId)

    if (error) {
        console.error('[UpdateRole] Error:', error)
        return { error: 'Erro ao atualizar permissão.' }
    }

    revalidatePath(`/admin/${tenantId}`)
    return { success: true }
}

export async function removeUserFromTenant(tenantId: string, userId: string) {
    await requireSuperAdmin()

    const admin = getAdminClient()

    // Remove the user_profiles entry (keeps auth.users intact so they can be reassigned)
    const { error } = await admin
        .from('user_profiles')
        .update({ tenant_id: null })
        .eq('id', userId)
        .eq('tenant_id', tenantId)

    if (error) {
        console.error('[RemoveUser] Error:', error)
        return { error: 'Erro ao remover usuário da organização.' }
    }

    revalidatePath(`/admin/${tenantId}`)
    return { success: true }
}
