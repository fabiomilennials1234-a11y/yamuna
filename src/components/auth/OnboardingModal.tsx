"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { Loader2, Globe, User as UserIcon } from "lucide-react";

export function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        username: "",
        website: ""
    });

    const supabase = createClient();

    useEffect(() => {
        const AUTH_TIMEOUT_MS = 6000;

        const checkProfile = async () => {
            try {
                const getUserWithTimeout = () =>
                    Promise.race([
                        supabase.auth.getUser(),
                        new Promise<{ data: { user: null } }>((resolve) =>
                            setTimeout(() => resolve({ data: { user: null } }), AUTH_TIMEOUT_MS)
                        ),
                    ]);

                const { data: { user } } = await getUserWithTimeout();

                if (!user) {
                    setLoading(false);
                    return;
                }

                setUser(user);

                // Fetch profile
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('username, website')
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error("Error fetching profile:", error);
                }

                // Check if missing info
                if (!profile?.username || !profile?.website) {
                    setFormData({
                        username: profile?.username || "",
                        website: profile?.website || ""
                    });
                    setIsOpen(true);
                }
            } catch (error) {
                console.error("Error checking profile:", error);
            } finally {
                setLoading(false);
            }
        };

        checkProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            // Validate inputs
            if (!formData.username.trim() || !formData.website.trim()) {
                alert("Por favor, preencha todos os campos.");
                setSaving(false);
                return;
            }

            const updates = {
                id: user.id,
                username: formData.username,
                website: formData.website,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('profiles')
                .upsert(updates);

            if (error) throw error;

            setIsOpen(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Erro ao salvar perfil. Tente novamente.");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-[425px] bg-[#0A0A0A] border border-white/10 rounded-lg shadow-lg p-6 animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        Bem-vindo ao Yamuna!
                    </h2>
                    <p className="text-sm text-slate-400">
                        Para começarmos, precisamos de algumas informações para configurar seu perfil.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="username" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">
                                Como devemos te chamar?
                            </label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <input
                                    id="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                    placeholder="Username ou Nome"
                                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 pl-9 text-sm text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="website" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">
                                Website da sua empresa
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <input
                                    id="website"
                                    type="text"
                                    value={formData.website}
                                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                                    placeholder="exemplo.com.br"
                                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 pl-9 text-sm text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                        <Button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-5"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                "Concluir Cadastro"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
