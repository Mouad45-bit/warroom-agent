// /src/pages/AuditLogPage.jsx

// ══════════════════════════════════════════════════════════════
//  JOURNAL D'ACTIVITÉ — Module 6
// ══════════════════════════════════════════════════════════════
//
//  Page strictement en lecture seule, accessible MANAGER et ADMIN.
//
//  Fonctionnalités :
//    - Liste paginée, triée par createdAt DESC
//    - Filtres : par utilisateur, par type d'action, par période
//    - Labels français lisibles (pas les codes enum)
//    - Cible cliquable (navigue vers alertes/incidents/agents)
//    - Aucun bouton d'action — registre immuable
//
//  Contrat d'API :
//    GET /api/admin/audit-log → MANAGER, ADMIN
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
    mockGetAuditLog,
    mockGetAuditUsers,
} from '../api/mock/mockAuditLog.js';
import { appConfig } from '../config/appConfig.js';
import Pagination from '../components/ui/Pagination.jsx';
import {
    Loader2,
    Filter,
    RotateCcw,
    ScrollText,
} from 'lucide-react';

//
const PAGE_SIZE = appConfig.pagination.auditLogPageSize;

// ══════════════════════════════════════════════════════════════
//  MAPPING actionType → label affiché en français
// ══════════════════════════════════════════════════════════════
const ACTION_LABELS = {
    LOGIN:                          'Connexion',
    LOGOUT:                         'Déconnexion',
    LOGIN_FAILED:                   'Tentative échouée',
    ALERT_ACKNOWLEDGED:             'A acquitté une alerte',
    ALERT_FALSE_POSITIVE:           'A qualifié en faux positif',
    ALERT_ESCALATED:                'A escaladé en incident',
    INCIDENT_CREATED:               'A créé un incident',
    INCIDENT_TAKEN:                 'A pris en charge',
    INCIDENT_STATUS_CHANGED:        'A changé le statut',
    INCIDENT_COUNTERMEASURE_ADDED:  'A ajouté une contre-mesure',
    INCIDENT_NOTE_ADDED:            'A ajouté une note',
    INCIDENT_REASSIGNED:            'A réassigné l\'incident',
    INCIDENT_RETURNED:              'A renvoyé au L1',
    INCIDENT_CLOSED:                'A clôturé l\'incident',
    AGENT_CONFIG_CHANGED:           'A modifié la config agent',
    USER_CREATED:                   'A créé un compte',
    USER_DISABLED:                  'A désactivé un compte',
};

// ── Couleur du badge de rôle ─────────────────────────────────
const ROLE_BADGE = {
    L1:      'bg-blue-100 text-blue-700',
    L2:      'bg-purple-100 text-purple-700',
    MANAGER: 'bg-amber-100 text-amber-700',
    ADMIN:   'bg-brand-50 text-brand-600',
};

// ── Types d'action groupés pour le filtre dropdown ───────────
const ACTION_TYPES = Object.keys(ACTION_LABELS);

export default function AuditLogPage() {
    const navigate = useNavigate();

    // ── Liste ────────────────────────────────────────────────
    const [entries, setEntries] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loadingList, setLoadingList] = useState(true);

    // ── Filtres ──────────────────────────────────────────────
    const [filters, setFilters] = useState({
        userId: '',
        actionType: '',
        from: '',
        to: '',
    });
    const [showFilters, setShowFilters] = useState(false);

    // ── Utilisateurs pour le dropdown ────────────────────────
    const [auditUsers, setAuditUsers] = useState([]);

    // Charger les utilisateurs distincts
    useEffect(() => {
        if (appConfig.useMockApi) {
            setAuditUsers(mockGetAuditUsers());
        } else {
            api.get('/api/admin/users').then(res => {
                setAuditUsers(res.data.map(u => ({
                    userId: u.userId,
                    fullName: u.fullName,
                    role: u.role,
                })));
            }).catch(err => console.error('Erreur users :', err));
        }
    }, []);

    // ══════════════════════════════════════════════════════════
    //  CHARGEMENT LISTE
    // ══════════════════════════════════════════════════════════
    const fetchEntries = useCallback(async () => {
        setLoadingList(true);
        try {
            if (appConfig.useMockApi) {
                const data = await mockGetAuditLog({
                    page,
                    size: PAGE_SIZE,
                    userId: filters.userId || undefined,
                    actionType: filters.actionType || undefined,
                    from: filters.from || undefined,
                    to: filters.to || undefined,
                });
                setEntries(data.content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
            } else {
                const params = new URLSearchParams();
                params.append('page', page);
                params.append('size', PAGE_SIZE);
                if (filters.userId) params.append('userId', filters.userId);
                if (filters.actionType) params.append('actionType', filters.actionType);
                if (filters.from) params.append('from', filters.from);
                if (filters.to) params.append('to', filters.to);

                const res = await api.get(`/api/admin/audit-log?${params.toString()}`);
                setEntries(res.data.content);
                setTotalPages(res.data.totalPages);
                setTotalElements(res.data.totalElements);
            }
        } catch (err) {
            console.error('Erreur chargement journal :', err);
        }
        setLoadingList(false);
    }, [page, filters]);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    // ── Réinitialiser les filtres ────────────────────────────
    const resetFilters = () => {
        setFilters({ userId: '', actionType: '', from: '', to: '' });
        setPage(0);
    };

    // ── Naviguer vers la cible ───────────────────────────────
    const navigateToTarget = (entry) => {
        if (entry.targetType === 'ALERT') navigate('/alerts');
        else if (entry.targetType === 'INCIDENT') navigate('/incidents');
        else if (entry.targetType === 'AGENT') navigate('/agents');
        else if (entry.targetType === 'USER') navigate('/admin/users');
        // SESSION → pas de navigation
    };

    const isFilterActive = filters.userId || filters.actionType || filters.from || filters.to;

    // ══════════════════════════════════════════════════════════
    //  RENDU
    // ══════════════════════════════════════════════════════════
    return (
        <div className="p-8">

            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    Journal d'activité
                </h1>
                <div className="flex items-center gap-2">
                    {isFilterActive && (
                        <button
                            onClick={resetFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Réinitialiser
                        </button>
                    )}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                            showFilters || isFilterActive
                                ? 'bg-brand-50 text-brand-600 border-brand-200'
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        <Filter className="w-3 h-3" />
                        Filtres
                    </button>
                </div>
            </div>

            {/* ── Barre de filtres ─────────────────────────────── */}
            {showFilters && (
                <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Par utilisateur */}
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">
                            Utilisateur
                        </label>
                        <select
                            value={filters.userId}
                            onChange={e => { setFilters(prev => ({ ...prev, userId: e.target.value })); setPage(0); }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        >
                            <option value="">Tous</option>
                            {auditUsers.map(u => (
                                <option key={u.userId} value={u.userId}>
                                    {u.fullName} ({u.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Par type d'action */}
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">
                            Action
                        </label>
                        <select
                            value={filters.actionType}
                            onChange={e => { setFilters(prev => ({ ...prev, actionType: e.target.value })); setPage(0); }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        >
                            <option value="">Toutes</option>
                            {ACTION_TYPES.map(type => (
                                <option key={type} value={type}>
                                    {ACTION_LABELS[type]}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date début */}
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">
                            Depuis
                        </label>
                        <input
                            type="datetime-local"
                            value={filters.from}
                            onChange={e => { setFilters(prev => ({ ...prev, from: e.target.value })); setPage(0); }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                    </div>

                    {/* Date fin */}
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">
                            Jusqu'à
                        </label>
                        <input
                            type="datetime-local"
                            value={filters.to}
                            onChange={e => { setFilters(prev => ({ ...prev, to: e.target.value })); setPage(0); }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                    </div>
                </div>
            )}

            {/* ── Tableau ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {loadingList ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-gray-400">
                        <ScrollText className="w-8 h-8 mb-2" />
                        <p className="text-sm">Aucune entrée trouvée.</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                <th className="px-6 py-4">Horodatage</th>
                                <th className="px-6 py-4">Utilisateur</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Cible</th>
                                <th className="px-6 py-4">Détails</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                            {entries.map(entry => {
                                const roleBadge = ROLE_BADGE[entry.userRole] || 'bg-gray-100 text-gray-500';
                                const canNavigate = entry.targetType !== 'SESSION';

                                return (
                                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                                        {/* Horodatage */}
                                        <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {new Date(entry.createdAt).toLocaleString('fr-FR', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                                            })}
                                        </td>

                                        {/* Utilisateur + badge rôle */}
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-gray-900">
                                                        {entry.userFullName}
                                                    </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${roleBadge}`}>
                                                        {entry.userRole}
                                                    </span>
                                            </div>
                                        </td>

                                        {/* Action (label français) */}
                                        <td className="px-6 py-3 text-xs text-gray-700">
                                            {ACTION_LABELS[entry.actionType] || entry.actionType}
                                        </td>

                                        {/* Cible (cliquable si pertinent) */}
                                        <td className="px-6 py-3">
                                            {canNavigate ? (
                                                <button
                                                    onClick={() => navigateToTarget(entry)}
                                                    className="text-xs text-brand-600 font-medium hover:underline cursor-pointer"
                                                >
                                                    {entry.targetLabel || '—'}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                        {entry.targetLabel || '—'}
                                                    </span>
                                            )}
                                        </td>

                                        {/* Détails (troncature) */}
                                        <td className="px-6 py-3">
                                            {entry.details ? (
                                                <span
                                                    className="text-xs text-gray-400 truncate block max-w-[200px]"
                                                    title={entry.details}
                                                >
                                                        {entry.details}
                                                    </span>
                                            ) : (
                                                <span className="text-xs text-gray-300">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="px-6 py-3">
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalElements={totalElements}
                                onPageChange={setPage}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}