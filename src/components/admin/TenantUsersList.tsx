"use client";

import { useState } from "react";
import { Plus, Shield, Eye, UserMinus, Loader2, MoreHorizontal } from "lucide-react";
import { CreateUserModal } from "./CreateUserModal";
import { updateUserRole, removeUserFromTenant } from "@/app/(dashboard)/admin/[tenantId]/actions";

export interface TenantUser {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    created_at: string;
}

interface TenantUsersListProps {
    users: TenantUser[];
    tenantId: string;
    tenantName: string;
}

function RoleBadge({ role }: { role: string }) {
    if (role === 'client_owner') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Shield size={12} />
                Admin
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Eye size={12} />
            Visualizador
        </span>
    );
}

function UserActions({ user, tenantId }: { user: TenantUser; tenantId: string }) {
    const [loading, setLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const handleRoleToggle = async () => {
        setLoading(true);
        setShowMenu(false);
        const newRole = user.role === 'client_owner' ? 'client_viewer' : 'client_owner';
        const res = await updateUserRole(tenantId, user.id, newRole);
        if (res?.error) alert(res.error);
        setLoading(false);
    };

    const handleRemove = async () => {
        if (!confirm(`Remover ${user.full_name || user.email} desta organização?`)) return;
        setLoading(true);
        setShowMenu(false);
        const res = await removeUserFromTenant(tenantId, user.id);
        if (res?.error) alert(res.error);
        setLoading(false);
    };

    if (loading) {
        return <Loader2 size={16} className="animate-spin text-[#71717A]" />;
    }

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-md hover:bg-[#27272A] text-[#71717A] hover:text-white transition-colors"
            >
                <MoreHorizontal size={16} />
            </button>

            {showMenu && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-8 z-20 w-48 bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl py-1">
                        <button
                            onClick={handleRoleToggle}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition-colors"
                        >
                            {user.role === 'client_owner' ? (
                                <><Eye size={14} /> Tornar Visualizador</>
                            ) : (
                                <><Shield size={14} /> Tornar Admin</>
                            )}
                        </button>
                        <button
                            onClick={handleRemove}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-[#27272A] transition-colors"
                        >
                            <UserMinus size={14} /> Remover da Organização
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export function TenantUsersList({ users, tenantId, tenantName }: TenantUsersListProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold tracking-tight">
                    Usuários ({users.length})
                </h4>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                    <Plus size={16} />
                    Adicionar Usuário
                </button>
            </div>

            {users.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl">
                    <p className="text-muted-foreground mb-2">Nenhum usuário vinculado.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                    >
                        Criar o primeiro usuário
                    </button>
                </div>
            ) : (
                <div className="border rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-muted/30">
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Nome</th>
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Email</th>
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Permissão</th>
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Criado em</th>
                                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-medium text-sm">{user.full_name || '—'}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-muted-foreground">{user.email}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <RoleBadge role={user.role} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-muted-foreground">
                                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <UserActions user={user} tenantId={tenantId} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <CreateUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tenantId={tenantId}
                tenantName={tenantName}
            />
        </div>
    );
}
