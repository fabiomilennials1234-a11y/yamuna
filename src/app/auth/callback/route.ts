import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        console.log('[Auth Callback] 🔄 Trocando code por session...');

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            console.log('[Auth Callback] ✅ Session criada com sucesso');
            console.log('[Auth Callback] 👤 User:', data.user?.email);

            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'

            const redirectUrl = isLocalEnv
                ? `${origin}${next}`
                : forwardedHost
                    ? `https://${forwardedHost}${next}`
                    : `${origin}${next}`;

            console.log('[Auth Callback] ➡️  Redirecionando para:', redirectUrl);
            return NextResponse.redirect(redirectUrl)
        } else {
            // Capture helpful error message
            console.error('[Auth Callback] ❌ Erro ao criar session:', error);
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
        }
    }

    // return the user to an error page with instructions if no code found
    return NextResponse.redirect(`${origin}/login?error=no_code_provided`)
}
