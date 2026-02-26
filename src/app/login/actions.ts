'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getSiteUrl(): string {
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl && process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        siteUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (!siteUrl && process.env.VERCEL_URL) {
        siteUrl = `https://${process.env.VERCEL_URL}`;
    }

    return siteUrl || 'http://localhost:3000';
}

function mapSupabaseError(error: { message: string; status?: number }): string {
    const msg = error.message.toLowerCase();

    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        return 'Email ou senha incorretos.';
    }
    if (msg.includes('email not confirmed')) {
        return 'Email ainda não confirmado. Verifique sua caixa de entrada.';
    }
    if (msg.includes('user already registered') || msg.includes('already been registered')) {
        return 'Este email já está cadastrado. Tente fazer login.';
    }
    if (msg.includes('password') && (msg.includes('short') || msg.includes('least'))) {
        return 'A senha deve ter no mínimo 6 caracteres.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
        return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    }
    if (msg.includes('email') && msg.includes('invalid')) {
        return 'Email inválido. Verifique o endereço digitado.';
    }
    if (msg.includes('signup is disabled')) {
        return 'Cadastro temporariamente desativado. Entre em contato com o suporte.';
    }

    return 'Erro ao processar sua solicitação. Tente novamente.';
}

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        redirect('/login?error=' + encodeURIComponent('Preencha email e senha.'))
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        redirect('/login?error=' + encodeURIComponent(mapSupabaseError(error)))
    }

    revalidatePath('/dashboard', 'layout')
    redirect('/dashboard')
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Server-side validation
    if (!email || !password) {
        redirect('/register?error=' + encodeURIComponent('Preencha email e senha.'))
    }

    if (password.length < 6) {
        redirect('/register?error=' + encodeURIComponent('A senha deve ter no mínimo 6 caracteres.'))
    }

    // Create user via admin API (already confirmed, no email verification needed)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceKey) {
        const admin = createServiceClient(supabaseUrl, serviceKey)

        const { error: createError } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: email.split('@')[0] },
        })

        if (createError) {
            redirect('/register?error=' + encodeURIComponent(mapSupabaseError(createError)))
        }

        // Sign in immediately
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (signInError) {
            redirect('/login?error=' + encodeURIComponent(mapSupabaseError(signInError)))
        }

        revalidatePath('/dashboard', 'layout')
        redirect('/dashboard')
    }

    // Fallback: standard signup (requires email confirmation)
    const siteUrl = getSiteUrl();

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${siteUrl}/auth/callback`,
        },
    })

    if (error) {
        redirect('/register?error=' + encodeURIComponent(mapSupabaseError(error)))
    }

    revalidatePath('/', 'layout')
    redirect('/register?message=' + encodeURIComponent('Conta criada! Verifique seu email para confirmar o cadastro.'))
}

