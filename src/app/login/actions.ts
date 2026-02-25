'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        redirect('/login?error=Invalid credentials')
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

    // Robust URL resolution for email confirmation
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    // In production, prefer VERCEL_PROJECT_PRODUCTION_URL over VERCEL_URL
    if (!siteUrl && process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        siteUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (!siteUrl && process.env.VERCEL_URL) {
        siteUrl = `https://${process.env.VERCEL_URL}`;
    }

    if (!siteUrl) {
        siteUrl = 'http://localhost:3000';
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${siteUrl}/auth/callback`,
        },
    })

    if (error) {
        redirect('/login?error=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    redirect('/login?message=Check email to continue sign in process')
}

export async function signInWithGoogle() {
    const supabase = await createClient()

    // Robust URL resolution for OAuth callback
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    // In production, prefer VERCEL_PROJECT_PRODUCTION_URL over VERCEL_URL
    // VERCEL_URL can point to preview deployments that get deleted
    if (!siteUrl && process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        siteUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (!siteUrl && process.env.VERCEL_URL) {
        siteUrl = `https://${process.env.VERCEL_URL}`;
    }

    if (!siteUrl) {
        siteUrl = 'http://localhost:3000';
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${siteUrl}/auth/callback`,
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
