// /src/components/layout/Layout.jsx

// ══════════════════════════════════════════════════════════════
//  LAYOUT PRINCIPAL — Sidebar + Zone de contenu
// ══════════════════════════════════════════════════════════════
//
//  La navigation s'adapte au rôle (contrat §6) :
//    L1 → Tableau de bord, File d'alertes
//    L2 → Tableau de bord, Incidents
//    MANAGER → Tout
//    ADMIN → Tableau de bord, Supervision agents, Administration,
//            Journal d'activité
// ══════════════════════════════════════════════════════════════

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
    LayoutDashboard,
    ShieldAlert,
    FileWarning,
    MonitorCheck,
    Users,
    LogOut,
    Shield,
    ScrollText,
} from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // ── Déconnexion ─────────────────────────────────────────
    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // ══════════════════════════════════════════════════════════
    //  DÉFINITION DES LIENS DE NAVIGATION PAR RÔLE
    // ══════════════════════════════════════════════════════════
    const navItems = [
        {
            label: 'Tableau de bord',
            to: '/',
            icon: LayoutDashboard,
            roles: ['L1', 'L2', 'MANAGER', 'ADMIN'],
        },
        {
            label: "File d'alertes",
            to: '/alerts',
            icon: ShieldAlert,
            roles: ['L1', 'L2', 'MANAGER'],
        },
        {
            label: 'Incidents',
            to: '/incidents',
            icon: FileWarning,
            roles: ['L1', 'L2', 'MANAGER'],
        },
        {
            label: 'Supervision agents',
            to: '/agents',
            icon: MonitorCheck,
            roles: ['MANAGER', 'ADMIN'],
        },
        {
            label: 'Administration',
            to: '/admin/users',
            icon: Users,
            roles: ['MANAGER', 'ADMIN'],
        },
        {
            label: "Journal d'activité",
            to: '/admin/audit-log',
            icon: ScrollText,
            roles: ['MANAGER', 'ADMIN'],
        },
    ];

    // Filtrer les liens selon le rôle de l'utilisateur connecté
    const visibleItems = navItems.filter((item) =>
        item.roles.includes(user?.role)
    );

    return (
        <div className="flex h-screen overflow-hidden">
            {/* ══════════════════════════════════════════════════════
          SIDEBAR — Fixe à gauche, fond blanc, bordure droite
          ══════════════════════════════════════════════════════ */}
            <aside className="flex flex-col w-64 shrink-0 bg-white border-r border-gray-200">
                {/* ── Logo / Titre ──────────────────────────────── */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-600">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">Vigilix</h1>
                        <p className="text-xs text-gray-400 leading-none">SOC Platform</p>
                    </div>
                </div>

                {/* ── Navigation ────────────────────────────────── */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {visibleItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'bg-brand-50 text-brand-600'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* ── Footer : Profil + Déconnexion ────────────── */}
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

            {/* ══════════════════════════════════════════════════════
          CONTENU PRINCIPAL — Scrollable, fond gris clair
          ══════════════════════════════════════════════════════ */}
            <main className="flex-1 overflow-y-auto bg-gray-50">
                <Outlet />
            </main>
        </div>
    );
}