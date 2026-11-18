'use client';

// src/components/layout/AppShell.jsx
//
// ══════════════════════════════════════════════════════════════
//  SHELL PROTÉGÉ — Sidebar + Zone de contenu
// ══════════════════════════════════════════════════════════════
//  Fusionne ProtectedRoute.jsx + Layout.jsx de l'ancien frontend.
//
//  En Next.js, il n'y a pas de <ProtectedRoute> comme composant
//  React Router. À la place, ce composant :
//    1. Vérifie la session (loading → spinner, !user → redirect)
//    2. Vérifie le rôle (allowedRoles optionnel)
//    3. Affiche la sidebar + le contenu (children)
//
//  Usage dans les layout.jsx des routes :
//    <AppShell> ou <AppShell allowedRoles={['MANAGER','ADMIN']}>
// ══════════════════════════════════════════════════════════════

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    ShieldAlert,
    FileWarning,
    MonitorCheck,
    Users,
    LogOut,
    Shield,
    ScrollText,
    Loader2,
} from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Tableau de bord',      to: '/',               icon: LayoutDashboard, roles: ['L1', 'L2', 'MANAGER', 'ADMIN'] },
    { label: "File d'alertes",       to: '/alerts',         icon: ShieldAlert,     roles: ['L1', 'L2', 'MANAGER'] },
    { label: 'Incidents',            to: '/incidents',      icon: FileWarning,     roles: ['L1', 'L2', 'MANAGER'] },
    { label: 'Supervision agents',   to: '/agents',         icon: MonitorCheck,    roles: ['MANAGER', 'ADMIN'] },
    { label: 'Administration',       to: '/admin/users',    icon: Users,           roles: ['MANAGER', 'ADMIN'] },
    { label: "Journal d'activité",   to: '/admin/audit-log',icon: ScrollText,      roles: ['MANAGER', 'ADMIN'] },
];

export default function AppShell({ children, allowedRoles }) {
    const { user, logout, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // ── Chargement initial ─────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    // ── Pas connecté → login ───────────────────────────────
    if (!user) {
        router.replace('/login');
        return null;
    }

    // ── Rôle insuffisant → dashboard ───────────────────────
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.replace('/');
        return null;
    }

    // ── Déconnexion ────────────────────────────────────────
    const handleLogout = async () => {
        await logout();
    };

    // ── Navigation filtrée par rôle ────────────────────────
    const visibleItems = NAV_ITEMS.filter((item) =>
        item.roles.includes(user?.role)
    );

    return (
        <div className="flex h-screen overflow-hidden">
            {/* ═══ SIDEBAR ═══ */}
            <aside className="flex flex-col w-64 shrink-0 bg-white border-r border-gray-200">
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-600">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">Vigilix</h1>
                        <p className="text-xs text-gray-400 leading-none">SOC Platform</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {visibleItems.map((item) => {
                        const isActive = item.to === '/'
                            ? pathname === '/'
                            : pathname.startsWith(item.to);

                        return (
                            <Link
                                key={item.to}
                                href={item.to}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'bg-brand-50 text-brand-600'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer : Profil + Déconnexion */}
                <div className="border-t border-gray-100 p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand-50 text-brand-600 font-semibold text-sm">
                            {user?.fullName?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {user?.fullName}
                            </p>
                            <p className="text-xs text-gray-400">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 rounded-lg hover:bg-red-50 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" />
                        Se déconnecter
                    </button>
                </div>
            </aside>

            {/* ═══ CONTENU PRINCIPAL ═══ */}
            <main className="flex-1 overflow-y-auto bg-gray-50">
                {children}
            </main>
        </div>
    );
}
