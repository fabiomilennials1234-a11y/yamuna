import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // Check for required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[Middleware] ❌ Missing Supabase environment variables');
        // Allow access if Supabase is not configured
        return supabaseResponse;
    }

    try {
        const supabase = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                        supabaseResponse = NextResponse.next({
                            request,
                        })
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, {
                                ...options,
                                sameSite: 'lax',
                                secure: process.env.NODE_ENV === 'production',
                                httpOnly: true
                            })
                        )
                    },
                },
            }
        )

        // IMPORTANT: Avoid writing any logic between createServerClient and
        // supabase.auth.getUser(). A simple mistake could make it very hard to debug
        // issues with users being randomly logged out.

        // Timeout para evitar carregamento infinito se Supabase estiver lento/indisponível
        const AUTH_TIMEOUT_MS = 5000
        const getUserWithTimeout = () =>
            Promise.race([
                supabase.auth.getUser(),
                new Promise<{ data: { user: null }; error: { message: string } }>((resolve) =>
                    setTimeout(() => resolve({ data: { user: null }, error: { message: 'Auth timeout' } }), AUTH_TIMEOUT_MS)
                ),
            ])

        const {
            data: { user },
            error,
        } = await getUserWithTimeout()

        if (error) {
            console.error('[Middleware] ❌ Supabase auth error:', error.message);
        }

        console.log('[Middleware]', {
            path: request.nextUrl.pathname,
            hasUser: !!user,
            userEmail: user?.email || 'none'
        });

        if (
            !user &&
            request.nextUrl.pathname !== '/' &&
            !request.nextUrl.pathname.startsWith('/login') &&
            !request.nextUrl.pathname.startsWith('/register') &&
            !request.nextUrl.pathname.startsWith('/auth') &&
            !request.nextUrl.pathname.startsWith('/api/debug')
        ) {
            console.log('[Middleware] ⚠️  Sem user, redirecionando para /login');
            // no user, potentially respond by redirecting the user to the login page
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // Redirect authenticated users from public pages to dashboard
        // NOTE: We don't redirect from /login to allow OAuth flow to complete
        if (
            user &&
            (request.nextUrl.pathname === '/' ||
                request.nextUrl.pathname === '/register')
        ) {
            console.log('[Middleware] ✅ User autenticado acessando página pública, redirecionando para /dashboard');
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }

        console.log('[Middleware] ✅ User autenticado, permitindo acesso');

        return supabaseResponse
    } catch (error) {
        console.error('[Middleware] ❌ Critical error:', error);
        // In case of error, redirect to login to be safe
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }
}

