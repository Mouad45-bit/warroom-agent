// /src/pages/DashboardPage.jsx

// ══════════════════════════════════════════════════════════════
//  TABLEAU DE BORD — Module 4 (Redesign)
// ══════════════════════════════════════════════════════════════
//
//  Chaque rôle ne voit QUE ce qui le concerne :
//    - L1 : alertes NEW par sévérité + MTTD + feedback L2
//    - L2 : incidents assignés par statut + MTTR + notifications
//    - MANAGER : tout + tableaux performance analystes
//    - ADMIN : compteurs agents (vert/orange/rouge)
//
//  Navigation : icône œil sur les en-têtes de section
//  (pas de lien par badge — on navigue vers la page, pas
//  vers un élément précis puisqu'on utilise des modals).
//
//  Notifications : sections dépliables (clic pour voir/cacher).
//
//  Contrat d'API :
//    GET /api/dashboard/stats          → tous les rôles
//    GET /api/dashboard/stats/manager  → MANAGER uniquement
//    GET /api/dashboard/notifications  → tous les rôles
//    PUT /api/dashboard/notifications/{id}/read → tous
// ══════════════════════════════════════════════════════════════

import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import api from '../api/client';
import {useAuth} from '../context/AuthContext';
import {appConfig} from '../config/appConfig.js';
import {
    mockGetStats,
    mockGetManagerStats,
    mockGetNotifications,
    mockMarkNotificationRead,
} from '../api/mock/mockDashboard.js';
import {
    ShieldAlert,
    FileWarning,
    MonitorCheck,
    Clock,
    Loader2,
    Eye,
    ChevronDown,
    ChevronRight,
    CheckCheck,
    RotateCcw,
    Inbox,
    Activity,
    TrendingUp,
    BarChart3,
} from 'lucide-react';

// ── Utilitaire : secondes → texte lisible ────────────────────
function formatDuration(seconds) {
    if (seconds == null) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;

    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);

    return m > 0 ? `${h}h${m}min` : `${h}h`;
}

// ── Couleurs de sévérité ─────────────────────────────────────
const SEV = {
    CRITICAL: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        dot: 'bg-red-500',
    },
    HIGH: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        dot: 'bg-orange-500',
    },
    MEDIUM: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
    },
    LOW: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        dot: 'bg-blue-500',
    },
    INFO: {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        dot: 'bg-gray-400',
    },
};

// ── Couleurs & labels de statut incident ─────────────────────
const INC_STATUS = {
    OPEN: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: 'OPEN',
    },
    INVESTIGATING: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        label: 'INVESTIGATING',
    },
    REMEDIATING: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        label: 'REMEDIATING',
    },
    RESOLVED: {
        bg: 'bg-teal-100',
        text: 'text-teal-700',
        label: 'RESOLVED',
    },
    CLOSED: {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        label: 'CLOSED',
    },
    CLOSED_FALSE_POSITIVE: {
        bg: 'bg-gray-100',
        text: 'text-gray-400',
        label: 'CLOSED_FALSE_POSITIVE',
    },
};

// ══════════════════════════════════════════════════════════════
//  COMPOSANTS UTILITAIRES
// ══════════════════════════════════════════════════════════════

// ── En-tête de section avec titre + œil de navigation ────────
function SectionHeader({title, icon: Icon, onNavigate, children}) {
    return (
        <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
                {Icon && <Icon className="h-4 w-4 shrink-0 text-gray-400"/>}
                <h2 className="truncate text-sm font-semibold text-gray-900">
                    {title}
                </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {children}

                {onNavigate && (
                    <button
                        type="button"
                        onClick={onNavigate}
                        title="Voir la page complète"
                        className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                    >
                        <Eye className="h-4 w-4 text-gray-400 transition-colors hover:text-brand-600"/>
                    </button>
                )}
            </div>
        </div>
    );
}

// ── Carte KPI compacte ───────────────────────────────────────
function KpiCard({label, value, sublabel, icon: Icon, iconBg, iconColor}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                <Icon className={`h-4.5 w-4.5 ${iconColor}`}/>
            </div>

            <div className="min-w-0">
                <p className="text-lg font-bold leading-tight text-gray-900">
                    {value}
                </p>

                <p className={`${appConfig.text.minMetaClass} truncate leading-tight text-gray-600`}>
                    {label}
                    {sublabel && (
                        <span className="text-gray-400"> · {sublabel}</span>
                    )}
                </p>
            </div>
        </div>
    );
}

// ── Section dépliable : notifications / feedback ─────────────
function CollapsibleSection({title, icon: Icon, count, defaultOpen = false, children}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50/50"
            >
                <div className="flex min-w-0 items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-gray-400"/>}

                    <span className="truncate text-sm font-medium text-gray-700">
                        {title}
                    </span>

                    {count > 0 && (
                        <span
                            className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 ${appConfig.text.minMetaClass} font-bold leading-none text-white`}>
                            {count}
                        </span>
                    )}
                </div>

                {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400"/>
                ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400"/>
                )}
            </button>

            {open && (
                <div className="border-t border-gray-100">
                    {children}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function DashboardPage() {
    const {user} = useAuth();
    const navigate = useNavigate();
    const role = user?.role;

    const [stats, setStats] = useState(null);
    const [managerStats, setManagerStats] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Chargement ───────────────────────────────────────────
    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);

            try {
                const s = appConfig.useMockApi
                    ? await mockGetStats()
                    : (await api.get('/api/dashboard/stats')).data;

                setStats(s);

                if (role === 'MANAGER') {
                    const ms = appConfig.useMockApi
                        ? await mockGetManagerStats()
                        : (await api.get('/api/dashboard/stats/manager')).data;

                    setManagerStats(ms);
                }

                const notifs = appConfig.useMockApi
                    ? await mockGetNotifications(true)
                    : (await api.get('/api/dashboard/notifications?unreadOnly=true')).data;

                setNotifications(notifs);
            } catch (err) {
                console.error('Erreur chargement dashboard :', err);
            } finally {
                setLoading(false);
            }
        };

        loadAll();
    }, [role]);

    // ── Marquer comme lu ─────────────────────────────────────
    const markRead = async (notifId) => {
        try {
            if (appConfig.useMockApi) {
                await mockMarkNotificationRead(notifId);
            } else {
                await api.put(`/api/dashboard/notifications/${notifId}/read`);
            }

            setNotifications(prev => prev.filter(n => n.id !== notifId));
        } catch (err) {
            console.error('Erreur :', err);
        }
    };

// ── Loading ──────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600"/>
            </div>
        );
    }

// ── Calculs dérivés ──────────────────────────────────────
    const totalNewAlerts = stats?.alertsBySeverity
        ? Object.values(stats.alertsBySeverity).reduce((a, b) => a + b, 0)
        : 0;

    const activeIncidents = stats?.incidentsByStatus
        ? (stats.incidentsByStatus.OPEN || 0)
        + (stats.incidentsByStatus.INVESTIGATING || 0)
        + (stats.incidentsByStatus.REMEDIATING || 0)
        : 0;

    const totalAgents =
        (stats?.agentsConnected || 0)
        + (stats?.agentsWarning || 0)
        + (stats?.agentsDisconnected || 0);

    const myNotifs = notifications.filter(n => {
        if (role === 'L1') return n.type === 'INCIDENT_RETURNED';
        if (role === 'L2') return n.type === 'INCIDENT_ASSIGNED';

        return true;
    });

// ══════════════════════════════════════════════════════════
//  RENDU PAR RÔLE
// ══════════════════════════════════════════════════════════
    return (
        <div className="w-full space-y-4 p-4 sm:p-5 lg:p-6">

            {/* ── Header compact ──────────────────────────────── */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-bold text-gray-900">
                    Tableau de bord
                </h1>

                <span className={`${appConfig.text.minMetaClass} text-gray-400`}>
                    {user?.fullName} · {role}
                </span>
            </div>

            {/* ════════════════════════════════════════════════════
                SECTION L1 — Alertes + MTTD + Feedback
            ════════════════════════════════════════════════════ */}
            {(role === 'L1' || role === 'MANAGER') && (
                <div className="space-y-3">

                    {/* Barre KPI : total alertes + MTTD */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <KpiCard
                            label="Alertes à traiter"
                            value={totalNewAlerts}
                            sublabel="non acquittées"
                            icon={ShieldAlert}
                            iconBg="bg-red-100"
                            iconColor="text-red-600"
                        />

                        <KpiCard
                            label="MTTD 24h"
                            value={formatDuration(stats?.mttd24h)}
                            sublabel="temps moyen de détection"
                            icon={Clock}
                            iconBg="bg-purple-100"
                            iconColor="text-purple-600"
                        />
                    </div>

                    {/* Alertes par sévérité */}
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                        <SectionHeader
                            title="Alertes par sévérité"
                            icon={ShieldAlert}
                            onNavigate={() => navigate('/alerts')}
                        />

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(sev => {
                                const count = stats?.alertsBySeverity?.[sev] || 0;
                                const c = SEV[sev];

                                return (
                                    <div
                                        key={sev}
                                        className={`flex flex-col items-center rounded-lg px-2 py-3 ${c.bg}`}
                                    >
                                        <span className={`text-xl font-bold ${c.text}`}>
                                            {count}
                                        </span>

                                        <span
                                            className={`${appConfig.text.minLabelClass} mt-0.5 font-semibold uppercase tracking-wide ${c.text}`}>
                                            {sev}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Feedback L1 */}
                    {role === 'L1' && (
                        <CollapsibleSection
                            title="Feedback — Incidents renvoyés"
                            icon={RotateCcw}
                            count={myNotifs.length}
                            defaultOpen={myNotifs.length > 0}
                        >
                            {myNotifs.length === 0 ? (
                                <p className="px-4 py-3 text-xs italic text-gray-400">
                                    Aucun retour en attente.
                                </p>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {myNotifs.map(n => (
                                        <div
                                            key={n.id}
                                            className="flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-gray-50/50"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs leading-relaxed text-gray-700">
                                                    {n.message}
                                                </p>

                                                <p className={`${appConfig.text.minMetaClass} mt-1 text-gray-400`}>
                                                    {new Date(n.createdAt).toLocaleString('fr-FR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                                                {n.relatedIncidentId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/incidents')}
                                                        title="Voir l'incident"
                                                        className="cursor-pointer rounded p-1 transition-colors hover:bg-gray-200"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 text-gray-400"/>
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => markRead(n.id)}
                                                    title="Marquer comme lu"
                                                    className="cursor-pointer rounded p-1 transition-colors hover:bg-green-100"
                                                >
                                                    <CheckCheck className="h-3.5 w-3.5 text-gray-400"/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CollapsibleSection>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════
                SECTION L2 — Incidents + MTTR + Notifications
            ════════════════════════════════════════════════════ */}
            {(role === 'L2' || role === 'MANAGER') && (
                <div className="space-y-3">

                    {/* Barre KPI : incidents actifs + MTTR */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <KpiCard
                            label="Incidents actifs"
                            value={activeIncidents}
                            sublabel="en cours de traitement"
                            icon={FileWarning}
                            iconBg="bg-blue-100"
                            iconColor="text-blue-600"
                        />

                        <KpiCard
                            label="MTTR 24h"
                            value={formatDuration(stats?.mttr24h)}
                            sublabel="temps moyen de résolution"
                            icon={Clock}
                            iconBg="bg-teal-100"
                            iconColor="text-teal-600"
                        />
                    </div>

                    {/* Incidents par statut */}
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                        <SectionHeader
                            title="Incidents par statut"
                            icon={FileWarning}
                            onNavigate={() => navigate('/incidents')}
                        />

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {['OPEN', 'INVESTIGATING', 'REMEDIATING'].map(status => {
                                const count = stats?.incidentsByStatus?.[status] || 0;
                                const c = INC_STATUS[status];

                                return (
                                    <div
                                        key={status}
                                        className={`flex flex-col items-center rounded-lg px-2 py-3 ${c.bg}`}
                                    >
                                        <span className={`text-xl font-bold ${c.text}`}>
                                            {count}
                                        </span>

                                        <span
                                            className={`${appConfig.text.minLabelClass} mt-0.5 font-semibold uppercase tracking-wide ${c.text}`}>
                                            {c.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Ligne compacte : résolus + clôturés */}
                        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-gray-50 pt-3">
                            {['RESOLVED', 'CLOSED', 'CLOSED_FALSE_POSITIVE'].map(status => {
                                const count = stats?.incidentsByStatus?.[status] || 0;
                                const c = INC_STATUS[status];

                                return (
                                    <div key={status} className="flex items-center gap-1.5">
                                        <span
                                            className={`inline-flex rounded px-2 py-0.5 ${appConfig.text.minMetaClass} font-semibold ${c.bg} ${c.text}`}>
                                            {count}
                                        </span>

                                        <span className={`${appConfig.text.minMetaClass} text-gray-400`}>
                                            {c.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notifications L2 */}
                    {role === 'L2' && (
                        <CollapsibleSection
                            title="Nouveaux incidents assignés"
                            icon={Inbox}
                            count={myNotifs.length}
                            defaultOpen={myNotifs.length > 0}
                        >
                            {myNotifs.length === 0 ? (
                                <p className="px-4 py-3 text-xs italic text-gray-400">
                                    Aucun incident en attente.
                                </p>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {myNotifs.map(n => (
                                        <div
                                            key={n.id}
                                            className="flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-gray-50/50"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs leading-relaxed text-gray-700">
                                                    {n.message}
                                                </p>

                                                <p className={`${appConfig.text.minMetaClass} mt-1 text-gray-400`}>
                                                    {new Date(n.createdAt).toLocaleString('fr-FR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                                                {n.relatedIncidentId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/incidents')}
                                                        title="Voir l'incident"
                                                        className="cursor-pointer rounded p-1 transition-colors hover:bg-gray-200"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 text-gray-400"/>
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => markRead(n.id)}
                                                    title="Marquer comme lu"
                                                    className="cursor-pointer rounded p-1 transition-colors hover:bg-green-100"
                                                >
                                                    <CheckCheck className="h-3.5 w-3.5 text-gray-400"/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CollapsibleSection>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════
                SECTION MANAGER — Performance analystes
            ════════════════════════════════════════════════════ */}
            {role === 'MANAGER' && managerStats && (
                <div className="space-y-3">

                    {/* Notifications Manager */}
                    <CollapsibleSection
                        title="Notifications"
                        icon={Inbox}
                        count={myNotifs.length}
                        defaultOpen={myNotifs.length > 0}
                    >
                        {myNotifs.length === 0 ? (
                            <p className="px-4 py-3 text-xs italic text-gray-400">
                                Aucune notification.
                            </p>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {myNotifs.map(n => (
                                    <div
                                        key={n.id}
                                        className="flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-gray-50/50"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <span
                                                className={`mr-1.5 inline-flex rounded px-2 py-0.5 ${appConfig.text.minMetaClass} font-bold uppercase tracking-wider ${
                                                    n.type === 'INCIDENT_RETURNED'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}
                                            >
                                                {n.type === 'INCIDENT_RETURNED' ? 'Renvoi' : 'Assignation'}
                                            </span>

                                            <p className="mt-1 text-xs leading-relaxed text-gray-700">
                                                {n.message}
                                            </p>

                                            <p className={`${appConfig.text.minMetaClass} mt-1 text-gray-400`}>
                                                {new Date(n.createdAt).toLocaleString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                                            {n.relatedIncidentId && (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/incidents')}
                                                    title="Voir l'incident"
                                                    className="cursor-pointer rounded p-1 transition-colors hover:bg-gray-200"
                                                >
                                                    <Eye className="h-3.5 w-3.5 text-gray-400"/>
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => markRead(n.id)}
                                                title="Marquer comme lu"
                                                className="cursor-pointer rounded p-1 transition-colors hover:bg-green-100"
                                            >
                                                <CheckCheck className="h-3.5 w-3.5 text-gray-400"/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CollapsibleSection>

                    {/* Tableau Performance L2 */}
                    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                        <div className="flex items-center gap-2 px-4 py-3">
                            <BarChart3 className="h-4 w-4 text-gray-400"/>
                            <h2 className="text-sm font-semibold text-gray-900">
                                Performance L2 — Incidents
                            </h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
                                <thead>
                                <tr className={`border-y border-gray-100 text-left ${appConfig.text.minLabelClass} font-medium uppercase tracking-wider text-gray-400`}>
                                    <th className="px-4 py-2.5">Analyste</th>
                                    <th className="px-4 py-2.5 text-center">Ouverts</th>
                                    <th className="px-4 py-2.5 text-center">Total</th>
                                    <th className="px-4 py-2.5 text-center">Tps moy. résolution</th>
                                </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-50">
                                {managerStats.incidentsByAssignee.map(a => (
                                    <tr key={a.userId} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-2.5 font-medium text-gray-900">
                                            {a.fullName}
                                        </td>

                                        <td className="px-4 py-2.5 text-center">
                                                <span
                                                    className={`inline-flex rounded px-2 py-0.5 ${appConfig.text.minMetaClass} font-bold ${
                                                        a.openCount > 3
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-green-100 text-green-700'
                                                    }`}
                                                >
                                                    {a.openCount}
                                                </span>
                                        </td>

                                        <td className="px-4 py-2.5 text-center text-gray-500">
                                            {a.totalAssigned}
                                        </td>

                                        <td className="px-4 py-2.5 text-center text-gray-500">
                                            {formatDuration(a.avgResolutionTimeSeconds)}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Tableau Performance L1 */}
                    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                        <div className="flex items-center gap-2 px-4 py-3">
                            <TrendingUp className="h-4 w-4 text-gray-400"/>
                            <h2 className="text-sm font-semibold text-gray-900">
                                Performance L1 — Triage
                            </h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
                                <thead>
                                <tr className={`border-y border-gray-100 text-left ${appConfig.text.minLabelClass} font-medium uppercase tracking-wider text-gray-400`}>
                                    <th className="px-4 py-2.5">Analyste</th>
                                    <th className="px-4 py-2.5 text-center">Triées / 24h</th>
                                    <th className="px-4 py-2.5 text-center">Tps moy. triage</th>
                                    <th className="px-4 py-2.5 text-center">Taux faux positifs</th>
                                </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-50">
                                {managerStats.triageRateByL1.map(l => (
                                    <tr key={l.userId} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-2.5 font-medium text-gray-900">
                                            {l.fullName}
                                        </td>

                                        <td className="px-4 py-2.5 text-center font-medium text-gray-700">
                                            {l.alertsTriaged24h}
                                        </td>

                                        <td className="px-4 py-2.5 text-center text-gray-500">
                                            {formatDuration(l.avgTriageTimeSeconds)}
                                        </td>

                                        <td className="px-4 py-2.5 text-center">
                                                <span
                                                    className={`inline-flex rounded px-2 py-0.5 ${appConfig.text.minMetaClass} font-bold ${
                                                        l.falsePositiveRate > 0.3
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-green-100 text-green-700'
                                                    }`}
                                                >
                                                    {Math.round(l.falsePositiveRate * 100)}%
                                                </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════
                SECTION ADMIN — Agents
            ════════════════════════════════════════════════════ */}
            {role === 'ADMIN' && (
                <div className="space-y-3">
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                        <SectionHeader
                            title="Santé des agents"
                            icon={MonitorCheck}
                            onNavigate={() => navigate('/agents')}
                        />

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {/* Connectés */}
                            <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3">
                                <span className="h-3 w-3 shrink-0 rounded-full bg-green-500"/>

                                <div>
                                    <p className="text-lg font-bold text-green-700">
                                        {stats?.agentsConnected || 0}
                                    </p>

                                    <p className={`${appConfig.text.minLabelClass} font-medium uppercase text-green-600`}>
                                        Connectés
                                    </p>
                                </div>
                            </div>

                            {/* Dégradés */}
                            <div className="flex items-center gap-3 rounded-lg bg-amber-50 p-3">
                                <span className="h-3 w-3 shrink-0 rounded-full bg-amber-500"/>

                                <div>
                                    <p className="text-lg font-bold text-amber-700">
                                        {stats?.agentsWarning || 0}
                                    </p>

                                    <p className={`${appConfig.text.minLabelClass} font-medium uppercase text-amber-600`}>
                                        Dégradés
                                    </p>
                                </div>
                            </div>

                            {/* Hors-ligne */}
                            <div className="flex items-center gap-3 rounded-lg bg-red-50 p-3">
                                <span className="h-3 w-3 shrink-0 rounded-full bg-red-500"/>

                                <div>
                                    <p className="text-lg font-bold text-red-700">
                                        {stats?.agentsDisconnected || 0}
                                    </p>

                                    <p className={`${appConfig.text.minLabelClass} font-medium uppercase text-red-600`}>
                                        Hors-ligne
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KPI Admin : total agents */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <KpiCard
                            label="Total agents"
                            value={totalAgents}
                            sublabel="enrôlés"
                            icon={Activity}
                            iconBg="bg-brand-50"
                            iconColor="text-brand-600"
                        />

                        <KpiCard
                            label="MTTR 24h"
                            value={formatDuration(stats?.mttr24h)}
                            sublabel="temps moyen de résolution"
                            icon={Clock}
                            iconBg="bg-purple-100"
                            iconColor="text-purple-600"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}