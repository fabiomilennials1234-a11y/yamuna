import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function ensureUserProfile(userId: string, fullName: string) {
    // Use service role to bypass RLS — this is a safety net if the DB trigger didn't fire
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
        console.warn('[Auth Callback] ⚠️  Service role key not available, skipping profile check');
        return;
    }

    try {
        const admin = createServiceClient(supabaseUrl, serviceKey);

        const { data: existing } = await admin
            .from('user_profiles')
            .select('id')
            .eq('id', userId)
            .single();

        if (!existing) {
            console.log('[Auth Callback] 📝 Criando user_profiles para novo usuário');
            const { error } = await admin
                .from('user_profiles')
                .insert({
                    id: userId,
                    full_name: fullName || '',
                    role: 'client_viewer',
                });

            if (error) {
                console.error('[Auth Callback] ❌ Erro ao criar user_profiles:', error.message);
            } else {
                console.log('[Auth Callback] ✅ user_profiles criado com sucesso');
            }
        }
    } catch (err) {
        console.error('[Auth Callback] ❌ Erro no ensureUserProfile:', err);
    }
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        console.log('[Auth Callback] 🔄 Trocando code por session...');

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            console.log('[Auth Callback] ✅ Session criada com sucesso');
            console.log('[Auth Callback] 👤 User:', data.user?.email);

            // Ensure user_profiles exists (fallback if DB trigger didn't fire)
            const userName = data.user?.user_metadata?.full_name
                || data.user?.user_metadata?.name
                || '';
            await ensureUserProfile(data.user!.id, userName);

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'

            const redirectUrl = isLocalEnv
                ? `${origin}${next}`
                : forwardedHost
                    ? `https://${forwardedHost}${next}`
                    : `${origin}${next}`;

            console.log('[Auth Callback] ➡️  Redirecionando para:', redirectUrl);
            return NextResponse.redirect(redirectUrl)
        } else {
            console.error('[Auth Callback] ❌ Erro ao criar session:', error);
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Erro ao confirmar conta. Tente fazer login novamente.')}`)
        }
    }

    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Link de confirmação inválido ou expirado.')}`)
}
