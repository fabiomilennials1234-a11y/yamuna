'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const fullName = formData.get('full_name') as string

    // Update Auth Metadata (this is what we display in the sidebar/layout)
    const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName }
    })

    if (authError) {
        console.error('Update auth metadata error:', authError)
    }

    // Also try to update profiles table if it exists
    const { error: tableError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)

    if (tableError) {
        console.warn('Update profiles table error (ignorable if using metadata):', tableError)
    }

    revalidatePath('/settings')
    revalidatePath('/', 'layout') // Refresh sidebar
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (password !== confirmPassword) {
        console.error('Passwords do not match')
        return // { error: 'As senhas não coincidem' }
    }

    if (password.length < 6) {
        console.error('Password too short')
        return // { error: 'A senha deve ter pelo menos 6 caracteres' }
    }

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        console.error('Update password error:', error.message)
        return // { error: error.message }
    }

    revalidatePath('/settings')
    // return { success: 'Senha atualizada com sucesso' }
}

export async function linkGoogle() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    })

    if (data.url) {
        redirect(data.url)
    }
}
