"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { createTenant } from "@/app/(dashboard)/agency/actions";

interface CreateTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateTenantModal({ isOpen, onClose }: CreateTenantModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError("");

        try {
            const res = await createTenant(formData);
            if (res?.error) {
                setError(res.error);
            } else {
                onClose();
            }
        } catch (e) {
            setError("Ocorreu um erro ao criar o cliente.");
        } finally {
            setIsLoading(false);
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-[#18181B] border border-[#27272A] rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Novo Cliente</h2>
                    <button onClick={onClose} className="text-[#A1A1AA] hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form action={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#A1A1AA] mb-1">Nome da Empresa</label>
                        <input
                            name="name"
                            type="text"
                            required
                            placeholder="Ex: Minha Loja Ltda"
                            className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#A1A1AA] mb-1">Slug (URL)</label>
                        <input
                            name="slug"
                            type="text"
                            placeholder="minha-loja (opcional)"
                            className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        <p className="text-xs text-[#52525B] mt-1">Gerado automaticamente se deixar vazio.</p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
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
                            Criar Cliente
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
