'use client';

import { signup, signInWithGoogle } from '@/app/login/actions'
import { NeonButton } from '@/components/ui/NeonButton'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function RegisterPage() {
    const searchParams = useSearchParams();
    const message = searchParams.get('message');
    const error = searchParams.get('error');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const handleSubmit = async (formData: FormData) => {
        const password = formData.get('password') as string;
        if (password.length < 6) {
            setPasswordError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }
        setPasswordError('');
        setLoading(true);
        await signup(formData);
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        await signInWithGoogle();
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050510] relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8 selection:bg-purple-500/30 selection:text-yellow-400">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                <div className="bg-[#0B0B1E]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        {/* Logo */}
                        <div className="flex justify-center mb-6">
                            <img
                                src="/logos/milennials_branco.png"
                                alt="Millennials Logo"
                                className="h-16 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                            />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                            Criar Conta
                        </h2>
                        <p className="text-sm text-slate-400">
                            Junte-se à revolução do marketing digital
                        </p>
                    </div>

                    {message && (
                        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg text-sm text-center">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="sr-only">Email</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    disabled={loading}
                                    className="block w-full rounded-xl border-0 bg-white/5 py-3 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-purple-500 sm:text-sm sm:leading-6 transition-all disabled:opacity-50"
                                    placeholder="Endereço de e-mail"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">Senha</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
                                    disabled={loading}
                                    onChange={() => passwordError && setPasswordError('')}
                                    className={`block w-full rounded-xl border-0 bg-white/5 py-3 text-white shadow-sm ring-1 ring-inset placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-purple-500 sm:text-sm sm:leading-6 transition-all disabled:opacity-50 ${passwordError ? 'ring-red-500/50' : 'ring-white/10'}`}
                                    placeholder="Escolha uma senha forte (mín. 6 caracteres)"
                                />
                                {passwordError && (
                                    <p className="mt-1.5 text-xs text-red-400">{passwordError}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <NeonButton
                                type="submit"
                                variant="gold"
                                disabled={loading}
                                className="w-full h-12 text-black font-bold text-base disabled:opacity-50"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Registrando...
                                    </span>
                                ) : 'Registrar-se'}
                            </NeonButton>
                        </div>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#0B0B1E]/90 px-2 text-slate-500 backdrop-blur-xl">Ou continue com</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={googleLoading || loading}
                            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24292F] transition-colors disabled:opacity-50"
                        >
                            {googleLoading ? (
                                <svg className="animate-spin h-5 w-5 text-gray-600" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}
                            {googleLoading ? 'Conectando...' : 'Google'}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-slate-500">Já tem uma conta?</span>{' '}
                        <Link href="/login" className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                            Faça Login
                        </Link>
                    </div>
                </div>
            </div>
            {/* Bottom Credit */}
            <div className="absolute bottom-6 text-center w-full text-xs text-slate-600">
                Powered by Milennials
            </div>
        </div>
    )
}
