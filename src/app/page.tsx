"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { NeonButton } from "@/components/ui/NeonButton";
import { ArrowRight, BarChart2, Lock, Zap, Shield } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#050510] relative overflow-x-hidden selection:bg-purple-500/30 selection:text-yellow-400">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-yellow-500/10 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] left-[-10%] w-[300px] h-[600px] bg-indigo-900/20 rounded-full blur-[100px]" />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 lg:px-12 backdrop-blur-md bg-[#050510]/50 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="relative w-40 h-12 lg:w-48 lg:h-14">
                        <Image
                            src="/logos/milennials_branco.png"
                            alt="Milennials Logo"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/login">
                        <NeonButton variant="ghost" size="sm">
                            Entrar
                        </NeonButton>
                    </Link>
                    <Link href="/register">
                        <NeonButton variant="gold" size="sm" className="hidden sm:flex">
                            Começar Agora
                        </NeonButton>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 flex flex-col items-center text-center z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-4xl mx-auto space-y-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-500/30 text-purple-300 text-xs tracking-widest uppercase font-bold mb-4">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Dashboard 2.0 Live
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
                        O Futuro do <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 animate-gradient-x uppercase">
                            MARKETING DE PERFORMANCE
                        </span>
                    </h1>

                    <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Domine seus dados com uma dashboard de alta performance.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link href="/register">
                            <NeonButton variant="gold" className="w-full sm:w-auto min-w-[200px] group">
                                Criar Conta Grátis
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </NeonButton>
                        </Link>
                        <Link href="/login">
                            <NeonButton variant="purple" className="w-full sm:w-auto min-w-[200px]">
                                Acessar Dashboard
                            </NeonButton>
                        </Link>
                    </div>
                </motion.div>

                {/* Stats / Trust Badges */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-70"
                >
                    {[
                        { label: "DASHBOARD UNIFICADO", value: "Visão 360°" },
                        { label: "MÉTRICAS AO VIVO", value: "Tempo Real" },
                        { label: "INTEGRAÇÃO TOTAL", value: "Apps" },
                        { label: "SEGURANÇA MILITAR", value: "Blindado" }
                    ].map((stat, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <span className="text-2xl font-bold text-white">{stat.value}</span>
                            <span className="text-xs text-slate-500 uppercase tracking-widest">{stat.label}</span>
                        </div>
                    ))}
                </motion.div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-6 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={BarChart2}
                            title="Analytics em Tempo Real"
                            description="Visualize métricas vitais de todas as suas campanhas em um único painel unificado."
                        />
                        <FeatureCard
                            icon={Zap}
                            title="Performance Extrema"
                            description="Carregamento instantâneo de dados pesados utilizando cache inteligente e borda."
                        />
                        <FeatureCard
                            icon={Shield}
                            title="Segurança Militar"
                            description="Seus dados estratégicos protegidos com criptografia de ponta a ponta."
                        />
                    </div>
                </div>
            </section>
            {/* Footer */}
            <footer className="py-8 relative z-10 border-t border-white/5 bg-[#050510]">
                <div className="text-center text-xs text-slate-600">
                    Powered by Milennials
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="p-8 rounded-2xl bg-[#0B0B1E]/80 backdrop-blur-sm border border-white/5 hover:border-purple-500/30 transition-colors group cursor-default"
        >
            <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                <Icon className="w-6 h-6 text-pink-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
                {description}
            </p>
        </motion.div>
    );
}
