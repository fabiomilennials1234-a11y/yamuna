'use client';

import { login } from './actions'
import { NeonButton } from '@/components/ui/NeonButton'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
    const searchParams = useSearchParams();
    const message = searchParams.get('message');
    const error = searchParams.get('error');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        await login(formData);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050510] relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8 selection:bg-purple-500/30 selection:text-yellow-400">
            {/* Background Effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none" />

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
                            Bem-vindo de volta
                        </h2>
                        <p className="text-sm text-slate-400">
                            Acesse seu dashboard de alta performance
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
                                    autoComplete="current-password"
                                    required
                                    disabled={loading}
                                    className="block w-full rounded-xl border-0 bg-white/5 py-3 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-purple-500 sm:text-sm sm:leading-6 transition-all disabled:opacity-50"
                                    placeholder="Sua senha"
                                />
                            </div>
                        </div>

                        <div>
                            <NeonButton
                                type="submit"
                                variant="purple"
                                disabled={loading}
                                className="w-full h-12 font-bold text-base disabled:opacity-50"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Entrando...
                                    </span>
                                ) : 'Entrar'}
                            </NeonButton>
                        </div>

                    </form>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-slate-500">Não tem uma conta?</span>{' '}
                        <Link href="/register" className="font-semibold text-yellow-400 hover:text-yellow-300 transition-colors">
                            Crie uma agora
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
