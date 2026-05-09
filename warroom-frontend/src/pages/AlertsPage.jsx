// /src/pages/AlertsPage.jsx

// ══════════════════════════════════════════════════════════════
//  FILE D'ALERTES — Module 1
// ══════════════════════════════════════════════════════════════
//
//  C'est LA page centrale du L1. Elle implémente :
//    - Liste paginée avec tri par sévérité DESC (GET /api/alerts)
//    - 7 filtres combinables côté serveur (contrat §2.1)
//    - Panneau latéral de détail (GET /api/alerts/{id}) (contrat §2.2)
//    - Acquittement (PUT /api/alerts/{id}/acknowledge) (contrat §2.3)
//    - Faux positif avec justification (PUT /api/alerts/{id}/false-positive) (contrat §2.4)
//    - Alertes en temps réel via SSE (contrat §2.6)
//
//  Les rôles L2 et MANAGER voient la liste en lecture seule
//  (pas de boutons d'action). Cf. catalogue d'actions §3.1.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import useSSE from '../hooks/useSSE';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import {
    Search,
    Filter,
    X,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ArrowUpRight,
    Eye,
    RotateCcw,
} from 'lucide-react';

// ── Valeurs possibles pour les filtres ────────────────────
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const STATUSES = ['NEW', 'ACKNOWLEDGED', 'FALSE_POSITIVE', 'ESCALATED'];

export default function AlertsPage() {
    const { user } = useAuth();
    const isL1 = user?.role === 'L1'; // Seul le L1 a les boutons d'action

    // ══════════════════════════════════════════════════════════
    //  ÉTAT DE LA LISTE
    // ══════════════════════════════════════════════════════════
    const [alerts, setAlerts] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loadingList, setLoadingList] = useState(true);

    // ══════════════════════════════════════════════════════════
    //  FILTRES (contrat §2.1 — query parameters)
    // ══════════════════════════════════════════════════════════
    const [filters, setFilters] = useState({
        severity: [],     // string[] multi-sélection
        status: [],       // string[] multi-sélection
        sourceType: [],   // string[] multi-sélection
        agentId: '',      // string
        from: '',         // ISO 8601
        to: '',           // ISO 8601
    });
    const [showFilters, setShowFilters] = useState(false);

    // ══════════════════════════════════════════════════════════
    //  PANNEAU DE DÉTAIL (contrat §2.2)
    // ══════════════════════════════════════════════════════════
    const [selectedAlertId, setSelectedAlertId] = useState(null);
    const [alertDetail, setAlertDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // ══════════════════════════════════════════════════════════
    //  MODALE FAUX POSITIF (contrat §2.4)
    // ══════════════════════════════════════════════════════════
    const [showFPModal, setShowFPModal] = useState(false);
    const [fpJustification, setFpJustification] = useState('');
    const [fpAlertId, setFpAlertId] = useState(null);
    const [fpError, setFpError] = useState(null);
    const [fpSubmitting, setFpSubmitting] = useState(false);

    // ══════════════════════════════════════════════════════════
    //  CHARGEMENT DE LA LISTE D'ALERTES
    // ══════════════════════════════════════════════════════════
    //  Construit l'URL avec les query params à partir des filtres.
    //  Appelé à chaque changement de page ou de filtres.
    const fetchAlerts = useCallback(async () => {
        setLoadingList(true);
        try {
            // Construction des query parameters (contrat §2.1)
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('size', 20);

            // Filtres multi-sélection : on ajoute un param par valeur
            // Ex : severity=CRITICAL&severity=HIGH
            filters.severity.forEach((s) => params.append('severity', s));
            filters.status.forEach((s) => params.append('status', s));
            filters.sourceType.forEach((s) => params.append('sourceType', s));

            if (filters.agentId) params.append('agentId', filters.agentId);
            if (filters.from) params.append('from', filters.from);
            if (filters.to) params.append('to', filters.to);

            const res = await api.get(`/api/alerts?${params.toString()}`);

            // Réponse paginée Spring Data (contrat §2.1)
            setAlerts(res.data.content);
            setTotalPages(res.data.totalPages);
            setTotalElements(res.data.totalElements);
        } catch (err) {
            console.error('Erreur chargement alertes :', err);
        }
        setLoadingList(false);
    }, [page, filters]);

    // Recharger quand la page ou les filtres changent
    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    // ══════════════════════════════════════════════════════════
    //  SSE — ALERTES EN TEMPS RÉEL (contrat §2.6)
    // ══════════════════════════════════════════════════════════
    //  Quand une nouvelle alerte arrive via le flux SSE,
    //  on l'insère en tête de la liste avec l'animation CSS
    //  "animate-flash" (fond jaune qui s'estompe en 2s).
    useSSE((newAlert) => {
        // On marque l'alerte comme "nouvelle" pour déclencher l'animation
        const alertWithFlash = { ...newAlert, _isNew: true };
        setAlerts((prev) => [alertWithFlash, ...prev]);
        setTotalElements((prev) => prev + 1);
    });

    // ══════════════════════════════════════════════════════════
    //  CHARGEMENT DU DÉTAIL D'UNE ALERTE
    // ══════════════════════════════════════════════════════════
    const openDetail = async (alertId) => {
        setSelectedAlertId(alertId);
        setLoadingDetail(true);
        try {
            const res = await api.get(`/api/alerts/${alertId}`);
            setAlertDetail(res.data);
        } catch (err) {
            console.error('Erreur chargement détail :', err);
        }
        setLoadingDetail(false);
    };

    const closeDetail = () => {
        setSelectedAlertId(null);
        setAlertDetail(null);
    };

    // ══════════════════════════════════════════════════════════
    //  ACTION : ACQUITTER (contrat §2.3)
    // ══════════════════════════════════════════════════════════
    //  PUT /api/alerts/{id}/acknowledge
    //  Met à jour la ligne dans le tableau SANS recharger la page.
    const handleAcknowledge = async (alertId) => {
        try {
            const res = await api.put(`/api/alerts/${alertId}/acknowledge`);
            // Mise à jour locale de l'alerte dans la liste
            setAlerts((prev) =>
                prev.map((a) =>
                    a.id === alertId ? { ...a, status: 'ACKNOWLEDGED', ...res.data } : a
                )
            );
            // Mise à jour dans le panneau de détail si ouvert
            if (alertDetail?.alert?.id === alertId) {
                setAlertDetail((prev) => ({
                    ...prev,
                    alert: { ...prev.alert, status: 'ACKNOWLEDGED', ...res.data },
                }));
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Erreur lors de l\'acquittement.';
            alert(msg);
        }
    };

    // ══════════════════════════════════════════════════════════
    //  ACTION : FAUX POSITIF (contrat §2.4)
    // ══════════════════════════════════════════════════════════
    //  PUT /api/alerts/{id}/false-positive avec { justification }
    //  La justification est obligatoire (min 10 caractères).
    const openFPModal = (alertId) => {
        setFpAlertId(alertId);
        setFpJustification('');
        setFpError(null);
        setShowFPModal(true);
    };

    const handleFalsePositive = async () => {
        setFpError(null);

        // Validation côté client avant d'envoyer
        if (fpJustification.trim().length < 10) {
            setFpError('Une justification est obligatoire (minimum 10 caractères).');
            return;
        }

        setFpSubmitting(true);
        try {
            const res = await api.put(`/api/alerts/${fpAlertId}/false-positive`, {
                justification: fpJustification.trim(),
            });

            // Mise à jour locale
            setAlerts((prev) =>
                prev.map((a) =>
                    a.id === fpAlertId
                        ? { ...a, status: 'FALSE_POSITIVE', ...res.data }
                        : a
                )
            );

            // Fermer le panneau de détail si l'alerte était ouverte
            if (alertDetail?.alert?.id === fpAlertId) {
                closeDetail();
            }

            setShowFPModal(false);
        } catch (err) {
            setFpError(err.response?.data?.message || 'Erreur lors de la qualification.');
        }
        setFpSubmitting(false);
    };

    // ══════════════════════════════════════════════════════════
    //  UTILITAIRE : toggle dans un filtre multi-sélection
    // ══════════════════════════════════════════════════════════
    const toggleFilter = (field, value) => {
        setPage(0); // Revenir à la page 0 quand on change un filtre
        setFilters((prev) => {
            const current = prev[field];
            const updated = current.includes(value)
                ? current.filter((v) => v !== value) // Retirer
                : [...current, value];                // Ajouter
            return { ...prev, [field]: updated };
        });
    };

    const resetFilters = () => {
        setPage(0);
        setFilters({
            severity: [],
            status: [],
            sourceType: [],
            agentId: '',
            from: '',
            to: '',
        });
    };

    // Vérifie si des filtres sont actifs (pour afficher le bouton "Réinitialiser")
    const hasActiveFilters =
        filters.severity.length > 0 ||
        filters.status.length > 0 ||
        filters.sourceType.length > 0 ||
        filters.agentId ||
        filters.from ||
        filters.to;

    // ══════════════════════════════════════════════════════════
    //  RENDU
    // ══════════════════════════════════════════════════════════
    return (
        <div className="flex h-full">
            {/* ══════════════════════════════════════════════════════
          PARTIE GAUCHE : Liste des alertes
          ══════════════════════════════════════════════════════ */}
            <div
                className={`flex-1 p-8 overflow-y-auto transition-all ${
                    selectedAlertId ? 'pr-4' : ''
                }`}
            >
                {/* ── Header ──────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">File d'alertes</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {totalElements} alerte{totalElements > 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Réinitialiser
                            </button>
                        )}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
                                showFilters
                                    ? 'bg-brand-50 text-brand-600 border-brand-200'
                                    : 'text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            <Filter className="w-4 h-4" />
                            Filtres
                            {hasActiveFilters && (
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-xs">
                  {filters.severity.length +
                      filters.status.length +
                      (filters.agentId ? 1 : 0)}
                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Barre de filtres (dépliable) ────────────────── */}
                {showFilters && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 space-y-4">
                        {/* Filtre Sévérité */}
                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                Sévérité
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {SEVERITIES.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => toggleFilter('severity', s)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                            filters.severity.includes(s)
                                                ? 'bg-brand-50 text-brand-600 border-brand-200'
                                                : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filtre Statut */}
                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                Statut
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {STATUSES.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => toggleFilter('status', s)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                            filters.status.includes(s)
                                                ? 'bg-brand-50 text-brand-600 border-brand-200'
                                                : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filtre Période */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                    Date début
                                </p>
                                <input
                                    type="datetime-local"
                                    value={filters.from}
                                    onChange={(e) => {
                                        setPage(0);
                                        setFilters((p) => ({ ...p, from: e.target.value }));
                                    }}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                                />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                    Date fin
                                </p>
                                <input
                                    type="datetime-local"
                                    value={filters.to}
                                    onChange={(e) => {
                                        setPage(0);
                                        setFilters((p) => ({ ...p, to: e.target.value }));
                                    }}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tableau des alertes ─────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {loadingList ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <Search className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">Aucune alerte trouvée</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Horodatage</th>
                                    <th className="px-6 py-4">Sévérité</th>
                                    <th className="px-6 py-4">Agent</th>
                                    <th className="px-6 py-4">Source</th>
                                    <th className="px-6 py-4">Règle</th>
                                    <th className="px-6 py-4">Message</th>
                                    <th className="px-6 py-4">Statut</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                {alerts.map((a) => (
                                    <tr
                                        key={a.id}
                                        onClick={() => openDetail(a.id)}
                                        className={`cursor-pointer hover:bg-gray-50/50 transition-colors ${
                                            selectedAlertId === a.id ? 'bg-brand-50/30' : ''
                                        } ${a._isNew ? 'animate-flash' : ''}`}
                                    >
                                        {/* Horodatage */}
                                        <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">
                                            {new Date(a.createdAt).toLocaleString('fr-FR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit',
                                            })}
                                        </td>

                                        {/* Sévérité (badge coloré) */}
                                        <td className="px-6 py-3.5">
                                            <SeverityBadge severity={a.severity} />
                                        </td>

                                        {/* Agent source */}
                                        <td className="px-6 py-3.5 text-gray-700 font-medium">
                                            {a.agent?.hostname || '—'}
                                        </td>

                                        {/* sourceType */}
                                        <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">
                                            {a.sourceType || '—'}
                                        </td>

                                        {/* ruleId */}
                                        <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">
                                            {a.ruleId}
                                        </td>

                                        {/* Message (tronqué à 60 caractères) */}
                                        <td className="px-6 py-3.5 text-gray-700 max-w-xs truncate">
                                            {a.message}
                                        </td>

                                        {/* Statut */}
                                        <td className="px-6 py-3.5">
                                            <StatusBadge status={a.status} />
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            <div className="px-6 py-4">
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

            {/* ══════════════════════════════════════════════════════
          PARTIE DROITE : Panneau de détail (contrat §2.2)
          ══════════════════════════════════════════════════════
          S'ouvre quand on clique sur une ligne du tableau.
          Affiche : alerte, payload brut, agent, alertes liées,
          et les boutons d'action pour le L1. */}
            {selectedAlertId && (
                <div className="w-[480px] shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
                    {loadingDetail ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                        </div>
                    ) : alertDetail ? (
                        <div className="p-6 space-y-6">
                            {/* Header du détail */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <SeverityBadge severity={alertDetail.alert.severity} />
                                        <StatusBadge status={alertDetail.alert.status} />
                                    </div>
                                    <p className="text-xs text-gray-400 font-mono mt-2">
                                        {alertDetail.alert.ruleId} · #{alertDetail.alert.id}
                                    </p>
                                </div>
                                <button
                                    onClick={closeDetail}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>

                            {/* Message complet */}
                            <div>
                                <p className="text-sm font-medium text-gray-900 leading-relaxed">
                                    {alertDetail.alert.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                    {new Date(alertDetail.alert.createdAt).toLocaleString('fr-FR')}
                                </p>
                            </div>

                            {/* ── Payload brut ─────────────────────────── */}
                            {/* Affiché dans un bloc <pre> monospace pour la lisibilité
                  Cf. plan Module 1 : "le payload brut du SecurityEvent
                  dans un bloc <pre> monospace" */}
                            {alertDetail.sourceEvent && (
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Payload brut
                                    </p>
                                    <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto leading-relaxed font-mono">
                    {alertDetail.sourceEvent.payload}
                  </pre>
                                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>
                      Collecté :{' '}
                        {new Date(alertDetail.sourceEvent.collectedAt).toLocaleString('fr-FR')}
                    </span>
                                        <span>
                      Reçu :{' '}
                                            {new Date(alertDetail.sourceEvent.receivedAt).toLocaleString('fr-FR')}
                    </span>
                                    </div>
                                </div>
                            )}

                            {/* ── Info agent ───────────────────────────── */}
                            {alertDetail.agent && (
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Agent source
                                    </p>
                                    <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
                                        <p>
                                            <span className="text-gray-400">Hostname :</span>{' '}
                                            <span className="font-medium text-gray-700">
                        {alertDetail.agent.hostname}
                      </span>
                                        </p>
                                        <p>
                                            <span className="text-gray-400">OS :</span>{' '}
                                            <span className="text-gray-700">
                        {alertDetail.agent.osName} {alertDetail.agent.osVersion}
                      </span>
                                        </p>
                                        <p className="font-mono text-xs text-gray-400">
                                            {alertDetail.agent.agentId}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── Alertes liées (contexte) ─────────────── */}
                            {alertDetail.relatedAlerts?.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Alertes récentes du même agent ({alertDetail.relatedAlerts.length})
                                    </p>
                                    <div className="space-y-2">
                                        {alertDetail.relatedAlerts.map((ra) => (
                                            <div
                                                key={ra.id}
                                                onClick={() => openDetail(ra.id)}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                                            >
                                                <SeverityBadge severity={ra.severity} />
                                                <p className="text-xs text-gray-600 truncate flex-1">
                                                    {ra.message}
                                                </p>
                                                <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(ra.createdAt).toLocaleTimeString('fr-FR')}
                        </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════════════════
                  BOUTONS D'ACTION — L1 uniquement
                  ══════════════════════════════════════════════
                  Cf. catalogue d'actions §3.5-3.7 :
                  "Pour le L1, trois boutons d'action sont visibles :
                   Acquitter, Faux positif, Escalader en incident.
                   Pour le L2 et le Manager, ces boutons sont absents."
                  ══════════════════════════════════════════════ */}
                            {isL1 && alertDetail.alert.status === 'NEW' && (
                                <div className="border-t border-gray-100 pt-6 space-y-3">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Actions
                                    </p>

                                    {/* Acquitter */}
                                    <button
                                        onClick={() => handleAcknowledge(alertDetail.alert.id)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Acquitter
                                    </button>

                                    {/* Faux positif */}
                                    <button
                                        onClick={() => openFPModal(alertDetail.alert.id)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Faux positif
                                    </button>

                                    {/* Escalader (désactivé — Module 2) */}
                                    <button
                                        disabled
                                        title="Disponible au prochain module"
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-400 text-sm font-medium rounded-xl border border-gray-100 bg-gray-50 cursor-not-allowed"
                                    >
                                        <ArrowUpRight className="w-4 h-4" />
                                        Escalader en incident
                                        <span className="text-xs opacity-60">(Module 2)</span>
                                    </button>
                                </div>
                            )}

                            {/* Si l'alerte est déjà acquittée, afficher le bouton FP + escalade */}
                            {isL1 && alertDetail.alert.status === 'ACKNOWLEDGED' && (
                                <div className="border-t border-gray-100 pt-6 space-y-3">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Actions
                                    </p>
                                    <button
                                        onClick={() => openFPModal(alertDetail.alert.id)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Faux positif
                                    </button>
                                    <button
                                        disabled
                                        title="Disponible au prochain module"
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-400 text-sm font-medium rounded-xl border border-gray-100 bg-gray-50 cursor-not-allowed"
                                    >
                                        <ArrowUpRight className="w-4 h-4" />
                                        Escalader en incident
                                        <span className="text-xs opacity-60">(Module 2)</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
          MODALE FAUX POSITIF (contrat §2.4)
          ══════════════════════════════════════════════════════
          Justification obligatoire ≥ 10 caractères.
          "Si le L1 tente de valider sans justification,
           le système bloque" (catalogue §3.7) */}
            {showFPModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Qualifier en faux positif
                            </h2>
                            <button
                                onClick={() => setShowFPModal(false)}
                                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                            Expliquez pourquoi cette alerte n'est pas une vraie menace. Cette
                            justification sera auditée par le Manager.
                        </p>

                        {/* Message d'erreur */}
                        {fpError && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm mb-4">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                {fpError}
                            </div>
                        )}

                        {/* Champ justification */}
                        <textarea
                            rows={4}
                            value={fpJustification}
                            onChange={(e) => setFpJustification(e.target.value)}
                            placeholder="Ex : Processus de compilation Maven en cours, consommation CPU normale pour cette opération."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            {fpJustification.length}/10 caractères minimum
                        </p>

                        {/* Boutons */}
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowFPModal(false)}
                                className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleFalsePositive}
                                disabled={fpSubmitting}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
                            >
                                {fpSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}