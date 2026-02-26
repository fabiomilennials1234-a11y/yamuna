"use client";

import { useState } from "react";
import { X, Loader2, Eye, EyeOff } from "lucide-react";
import { createPortal } from "react-dom";
import { createUserForTenant } from "@/app/(dashboard)/admin/[tenantId]/actions";

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    tenantName: string;
}

export function CreateUserModal({ isOpen, onClose, tenantId, tenantName }: CreateUserModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    if (!isOpen) return null;

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError("");
        setSuccess("");
        setPasswordError("");

        const password = formData.get('password') as string;
        if (password.length < 6) {
            setPasswordError("A senha deve ter no mínimo 6 caracteres.");
            setIsLoading(false);
            return;
        }

        try {
            const res = await createUserForTenant(tenantId, formData);
            if (res?.error) {
                setError(res.error);
            } else {
                setSuccess("Usuário criado com sucesso!");
                setTimeout(() => {
                    onClose();
                    setSuccess("");
                }, 1500);
            }
        } catch {
            setError("Ocorreu um erro ao criar o usuário.");
        } finally {
            setIsLoading(false);
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-[#18181B] border border-[#27272A] rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Novo Usuário</h2>
                        <p className="text-sm text-[#71717A] mt-1">{tenantName}</p>
                    </div>
                    <button onClick={onClose} className="text-[#A1A1AA] hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form action={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#A1A1AA] mb-1">Nome Completo</label>
                        <input
                            name="fullName"
                            type="text"
                            required
                            placeholder="Ex: João Silva"
                            className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#A1A1AA] mb-1">Email</label>
                        <input
                            name="email"
                            type="email"
                            required
                            placeholder="usuario@empresa.com"
                            className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#A1A1AA] mb-1">Senha</label>
                        <div className="relative">
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={6}
                                placeholder="Mínimo 6 caracteres"
                                onChange={() => passwordError && setPasswordError("")}
                                className={`w-full bg-[#09090B] border rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${passwordError ? 'border-red-500/50' : 'border-[#27272A]'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-[#71717A] hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {passwordError && (
                            <p className="text-xs text-red-400 mt-1">{passwordError}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#A1A1AA] mb-1">Permissão</label>
                        <select
                            name="role"
                            defaultValue="client_viewer"
                            className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                            <option value="client_viewer">Visualizador (somente leitura)</option>
                            <option value="client_owner">Administrador do Cliente</option>
                        </select>
                        <p className="text-xs text-[#52525B] mt-1">
                            Visualizadores podem ver dados. Administradores podem gerenciar configurações.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                            {success}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-[#A1A1AA] hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {isLoading && <Loader2 size={16} className="animate-spin" />}
                            Criar Usuário
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
