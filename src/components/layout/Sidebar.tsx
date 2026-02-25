"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Users,
    Settings,
    LogOut,
    ChevronsUpDown,
    Menu,
    Bell
} from "lucide-react";
import { signout } from "@/app/login/actions";
import { useState } from "react";

import { MENU_CONFIG } from "@/config/menu";

// ... existing code ...

export function Sidebar({ user, modules = [], tenantName = "Yamuna" }: { user?: { name: string, email: string, avatar: string, role: string }, modules?: string[], tenantName?: string }) {
    const pathname = usePathname();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Default values if user is not provided
    const userName = user?.name || "Yamuna";
    const userRole = user?.role || "Cliente (Milennials)";
    const userAvatar = user?.avatar;
    const isSuperAdmin = userRole === 'Super Admin' || user?.role === 'super_admin';

    // Filter menu items based on active modules
    // If modules is empty (fallback), show nothing or maybe everything? Safest is nothing or basic dashboard.
    // For Yamuna (super admin usually), it will have all modules seeded.
    const activeMenuItems = MENU_CONFIG.filter(item => {
        // Always show dashboard if modules list is empty/undefined as a fallback?
        // Or strictly follow the list. Let's strictly follow.
        // If 'dashboard' module is present, 'checkin_loja' and 'api_diag' are shown.
        return modules.includes(item.moduleNeeded);
    });

    return (
        <>
            {/* Mobile Header (Visible only on mobile) */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0d0d10] border-b border-[#222226] flex items-center justify-between px-4 z-40">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="text-[#E3E3E8] p-1 hover:bg-[#1C1C1F] rounded-md transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#E3E3E8] text-base">{tenantName}</span>
                        <ChevronsUpDown size={14} className="text-[#64646B]" />
                    </div>
                </div>
                <button className="text-[#E3E3E8] p-1 hover:bg-[#1C1C1F] rounded-full transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#0d0d10]" />
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50 overflow-hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileOpen(false)}
                    />

                    {/* Menu Drawer */}
                    <div className="absolute top-0 left-0 w-[85%] max-w-[320px] h-full bg-[#0d0d10] flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
                        {/* Drawer Header: Profile & Settings */}
                        <div className="p-4 border-b border-[#222226]">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {userAvatar ? (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={userAvatar}
                                                alt={userName}
                                                className="w-10 h-10 rounded-full border border-white/10"
                                            />
                                        </>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-inner">
                                            {userName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-[#E3E3E8] text-sm flex items-center gap-1">
                                            {tenantName}
                                            <ChevronsUpDown size={12} className="text-emerald-500" />
                                        </span>
                                        <span className="text-xs text-[#909099]">{userName}</span>
                                    </div>
                                </div>
                                <button onClick={() => setIsMobileOpen(false)} className="text-[#909099]">
                                    <Settings size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Navigation Items */}
                        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1 custom-scrollbar">
                            {/* AGENCY PORTAL LINK (Super Admin Only) */}
                            {isSuperAdmin && (
                                <div className="mb-4 pb-2 border-b border-[#222226] mx-2">
                                    <Link
                                        href="/agency"
                                        onClick={() => setIsMobileOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors",
                                            pathname === "/agency"
                                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                                : "text-indigo-300 hover:bg-slate-800"
                                        )}
                                    >
                                        <Users size={18} />
                                        Portal da Agência
                                    </Link>
                                </div>
                            )}

                            {activeMenuItems.map((item) => {
                                const isActive = pathname === item.path;
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.key}
                                        href={item.path}
                                        onClick={() => setIsMobileOpen(false)}
                                        className={cn(
                                            "flex items-center gap-4 px-3 py-3 rounded-md text-sm transition-colors font-medium",
                                            isActive
                                                ? "text-[#4ADE80]" // Greenish for active as per image
                                                : "text-[#E3E3E8] hover:bg-[#1C1C1F]"
                                        )}
                                    >
                                        <Icon size={20} className={isActive ? "text-[#4ADE80]" : "text-[#4ADE80]"} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Footer / Logout */}
                        <div className="p-4 border-t border-[#222226]">
                            <form action={signout}>
                                <button type="submit" className="w-full flex items-center justify-center gap-2 bg-[#1C1C1F] hover:bg-[#27272A] text-[#E3E3E8] py-3 rounded-lg border border-[#27272A] text-sm font-medium transition-colors">
                                    <LogOut size={16} className="text-red-400" />
                                    Logout
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Sidebar (unchanged) */}
            <aside className="hidden lg:flex flex-col w-[260px] h-screen bg-[#0d0d10] border-r border-[#222226] fixed left-0 top-0 z-50">
                {/* Header / Logo Area */}
                <div className="h-14 flex items-center px-4 border-b border-[#222226]">
                    <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logos/yamuna_logo.png"
                            alt="Yamuna Logo"
                            className="h-8 w-auto object-contain"
                        />
                        <span className="font-semibold text-[#E3E3E8] text-sm">Yamuna Dashboard</span>
                    </div>
                </div>

                {/* Scrollable Navigation */}
                <div className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
                    <nav className="space-y-0.5">
                        {/* AGENCY PORTAL LINK (Super Admin Only) */}
                        {isSuperAdmin && (
                            <div className="mb-4 pb-2 border-b border-[#222226]">
                                <Link
                                    href="/agency"
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                                        pathname === "/agency"
                                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                            : "text-indigo-300 hover:bg-slate-800"
                                    )}
                                >
                                    <Users size={16} />
                                    Portal da Agência
                                </Link>
                            </div>
                        )}

                        {activeMenuItems.map((item) => {
                            const isActive = pathname === item.path;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.key}
                                    href={item.path}
                                    prefetch={true}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                                        isActive
                                            ? "bg-[#2A2A2F] text-[#E3E3E8]"
                                            : "text-[#909099] hover:bg-[#1C1C1F] hover:text-[#D4D4D8]"
                                    )}
                                >
                                    <Icon size={16} className={isActive ? "text-[#E3E3E8]" : "text-[#909099]"} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Footer / User Profile (Claude Style) */}
                <div className="p-2 border-t border-[#222226]">
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-3 w-full p-2 hover:bg-[#1C1C1F] rounded-md transition-colors group cursor-pointer"
                        >
                            {userAvatar ? (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={userAvatar}
                                        alt={userName}
                                        className="w-8 h-8 rounded-full border border-white/10"
                                    />
                                </>
                            ) : (
                                <div className="w-8 h-8 rounded bg-gradient-to-r from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                                    {userName.charAt(0).toUpperCase()}
                                </div>
                            )}

                            <div className="flex-1 text-left overflow-hidden">
                                <p className="text-sm font-medium text-[#E3E3E8] truncate">{userName}</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[11px] text-[#909099] truncate">
                                        {userRole}
                                    </p>
                                    {userRole === 'Super Admin' && (
                                        <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1 py-px rounded font-medium uppercase tracking-wider">
                                            PRO
                                        </span>
                                    )}
                                </div>
                            </div>
                            <ChevronsUpDown size={14} className="text-[#64646B] group-hover:text-[#909099]" />
                        </button>

                        {/* Popover Menu */}
                        {isProfileOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-0"
                                    onClick={() => setIsProfileOpen(false)}
                                />
                                <div className="absolute bottom-[calc(100%+8px)] left-0 w-full bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl py-1 z-10 animate-in fade-in zoom-in-95 duration-100 min-w-[200px]">
                                    <div className="px-3 py-2 border-b border-[#27272A]">
                                        <p className="text-xs text-[#909099]">Logado como</p>
                                        <p className="text-sm text-[#E3E3E8] truncate">{user?.email}</p>
                                    </div>
                                    <Link
                                        href="/settings"
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-[#B4B4BB] hover:bg-[#27272A] hover:text-[#E3E3E8] mt-1"
                                        onClick={() => setIsProfileOpen(false)}
                                    >
                                        <Settings size={14} />
                                        Configurações
                                    </Link>
                                    <div className="h-px bg-[#27272A] my-1" />
                                    <form action={signout}>
                                        <button type="submit" className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#B4B4BB] hover:bg-[#27272A] hover:text-red-400 text-left">
                                            <LogOut size={14} />
                                            Sair
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
