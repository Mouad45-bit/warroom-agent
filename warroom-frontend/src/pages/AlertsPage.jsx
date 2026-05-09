// /src/pages/AlertsPage.jsx

// ══════════════════════════════════════════════════════════════
//  FILE D'ALERTES — Module 1
// ══════════════════════════════════════════════════════════════
//
//  C'est LA page centrale du L1. Elle implémente :
//    - Liste paginée avec tri par sévérité DESC (GET /api/alerts)
//    - 7 filtres combinables côté serveur (contrat §2.1)
//    - Panneau latéral de détail (GET /api/alerts/{id}) (contrat §2.2)
//    - Acquittement avec confirmation (PUT /api/alerts/{id}/acknowledge) (contrat §2.3)
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
import ConfirmModal from '../components/ConfirmModal';
import FalsePositiveModal from '../components/FalsePositiveModal';
import { mockGetAlerts, mockGetAlertDetail, mockAcknowledgeAlert, mockFalsePositiveAlert } from '../api/mockAlerts';
import {
    Search,
    Filter,
    X,
    Loader2,
    CheckCircle2,
    XCircle,
    ArrowUpRight,
    RotateCcw,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION DE L'ENVIRONNEMENT
// true = Utilise les fausses données (pour coder l'UI)
// false = Utilise le vrai backend Spring Boot
// ══════════════════════════════════════════════════════════════
const USE_MOCK_API = true;

// ── Valeurs possibles pour les filtres ────────────────────
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const STATUSES = ['NEW', 'ACKNOWLEDGED', 'FALSE_POSITIVE', 'ESCALATED'];
const PAGE_SIZE = 10; // Permet de tester la pagination avec les 35 alertes mock

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
        severity: [],
        status: [],
        sourceType: [],
        agentId: '',
        from: '',
        to: '',
    });
    const [showFilters, setShowFilters] = useState(false);

    // ══════════════════════════════════════════════════════════
    //  PANNEAU DE DÉTAIL (contrat §2.2)
    // ══════════════════════════════════════════════════════════
    const [selectedAlertId, setSelectedAlertId] = useState(null);
    const [alertDetail, setAlertDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // ══════════════════════════════════════════════════════════
    //  MODALE DE CONFIRMATION (Acquitter)
    // ══════════════════════════════════════════════════════════
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        alertId: null,
        title: '',
        message: '',
        type: 'success',
        confirmText: '',
    });

    // ══════════════════════════════════════════════════════════
    //  MODALE FAUX POSITIF (contrat §2.4)
    // ══════════════════════════════════════════════════════════
    const [fpModal, setFpModal] = useState({ isOpen: false, alertId: null });
    const [fpError, setFpError] = useState(null);
    const [fpSubmitting, setFpSubmitting] = useState(false);

    // ══════════════════════════════════════════════════════════
    //  CHARGEMENT DE LA LISTE D'ALERTES
    // ══════════════════════════════════════════════════════════
    const fetchAlerts = useCallback(async () => {
        setLoadingList(true);
        try {
            if (USE_MOCK_API) {
                // ── Mock : appel local ──────────────────────
                const data = await mockGetAlerts({
                    page,
                    size: PAGE_SIZE,
                    severity: filters.severity,
                    status: filters.status,
                    sourceType: filters.sourceType,
                    agentId: filters.agentId,
                });
                setAlerts(data.content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
            } else {
                // ── Backend réel ────────────────────────────
                const params = new URLSearchParams();
                params.append('page', page);
                params.append('size', PAGE_SIZE);
                filters.severity.forEach(s => params.append('severity', s));
                filters.status.forEach(s => params.append('status', s));
                filters.sourceType.forEach(s => params.append('sourceType', s));
                if (filters.agentId) params.append('agentId', filters.agentId);
                if (filters.from) params.append('from', filters.from);
                if (filters.to) params.append('to', filters.to);

                const res = await api.get(`/api/alerts?${params.toString()}`);
                setAlerts(res.data.content);
                setTotalPages(res.data.totalPages);
                setTotalElements(res.data.totalElements);
            }
        } catch (err) {
            console.error('Erreur chargement alertes :', err);
        }
        setLoadingList(false);
    }, [page, filters]);

    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

    // ══════════════════════════════════════════════════════════
    //  SSE — ALERTES EN TEMPS RÉEL (contrat §2.6)
    // ══════════════════════════════════════════════════════════
    useSSE((newAlert) => {
        const alertWithFlash = { ...newAlert, _isNew: true };
        setAlerts(prev => [alertWithFlash, ...prev]);
        setTotalElements(prev => prev + 1);
    });

    // ══════════════════════════════════════════════════════════
    //  CHARGEMENT DU DÉTAIL
    // ══════════════════════════════════════════════════════════
    const openDetail = async (alertId) => {
        setSelectedAlertId(alertId);
        setLoadingDetail(true);
        try {
            if (USE_MOCK_API) {
                const data = await mockGetAlertDetail(alertId);
                setAlertDetail(data);
            } else {
                const res = await api.get(`/api/alerts/${alertId}`);
                setAlertDetail(res.data);
            }
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
    //  ACTION : ACQUITTER (via ConfirmModal)
    // ══════════════════════════════════════════════════════════
    const requestAcknowledge = (alertId) => {
        setConfirmDialog({
            isOpen: true,
            alertId,
            title: 'Acquitter cette alerte',
            message: 'En acquittant, vous confirmez avoir pris connaissance de cette alerte et la prenez en charge. Cette action est irréversible.',
            type: 'success',
            confirmText: 'Acquitter',
        });
    };

    const executeAcknowledge = async () => {
        const { alertId } = confirmDialog;
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));

        try {
            let result;
            if (USE_MOCK_API) {
                result = await mockAcknowledgeAlert(alertId);
            } else {
                const res = await api.put(`/api/alerts/${alertId}/acknowledge`);
                result = res.data;
            }

            // Mise à jour locale de la liste
            setAlerts(prev => prev.map(a =>
                a.id === alertId ? { ...a, status: 'ACKNOWLEDGED', ...result } : a
            ));

            // Mise à jour dans le panneau de détail si ouvert
            if (alertDetail?.alert?.id === alertId) {
                setAlertDetail(prev => ({
                    ...prev,
                    alert: { ...prev.alert, status: 'ACKNOWLEDGED', ...result },
                }));
            }
        } catch (err) {
            alert(err.message || 'Erreur lors de l\'acquittement.');
        }
    };

    // ══════════════════════════════════════════════════════════
    //  ACTION : FAUX POSITIF (via FalsePositiveModal)
    // ══════════════════════════════════════════════════════════
    const openFPModal = (alertId) => {
        setFpModal({ isOpen: true, alertId });
        setFpError(null);
    };

    const handleFalsePositive = async (justification) => {
        setFpError(null);
        setFpSubmitting(true);

        try {
            let result;
            if (USE_MOCK_API) {
                result = await mockFalsePositiveAlert(fpModal.alertId, justification);
            } else {
                const res = await api.put(`/api/alerts/${fpModal.alertId}/false-positive`, { justification });
                result = res.data;
            }

            // Mise à jour locale
            setAlerts(prev => prev.map(a =>
                a.id === fpModal.alertId ? { ...a, status: 'FALSE_POSITIVE', ...result } : a
            ));

            // Fermer le détail si c'était l'alerte ouverte
            if (alertDetail?.alert?.id === fpModal.alertId) closeDetail();

            setFpModal({ isOpen: false, alertId: null });
        } catch (err) {
            setFpError(err.message || 'Erreur lors de la qualification.');
        }
        setFpSubmitting(false);
    };

    // ══════════════════════════════════════════════════════════
    //  UTILITAIRES FILTRES
    // ══════════════════════════════════════════════════════════
    const toggleFilter = (field, value) => {
        setPage(0);
        setFilters(prev => {
            const current = prev[field];
            const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            return { ...prev, [field]: updated };
        });
    };

    const resetFilters = () => {
        setPage(0);
        setFilters({ severity: [], status: [], sourceType: [], agentId: '', from: '', to: '' });
    };

    const hasActiveFilters =
        filters.severity.length > 0 || filters.status.length > 0 ||
        filters.sourceType.length > 0 || filters.agentId || filters.from || filters.to;

    // ══════════════════════════════════════════════════════════
    //  RENDU
    // ══════════════════════════════════════════════════════════
    return (
        <div className="flex h-full">
            {/* ════════════════════════════════════════════════
                PARTIE GAUCHE : Liste des alertes
                ════════════════════════════════════════════════ */}
            <div className={`flex-1 p-8 overflow-y-auto transition-all ${selectedAlertId ? 'pr-4' : ''}`}>

                {/* ── Header ─────────────────────────────────── */}
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
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Réinitialiser
                            </button>
                        )}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-colors cursor-pointer ${
                                showFilters
                                    ? 'bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-200'
                                    : 'text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                            <Filter className="w-4 h-4" />
                            Filtres
                            {hasActiveFilters && (
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-xs">
                                    {filters.severity.length + filters.status.length + (filters.agentId ? 1 : 0)}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Barre de filtres (dépliable) ───────────── */}
                {showFilters && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 space-y-6">

                        {/**/}
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Filtre Sévérité */}
                            <div className="flex-1">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Sévérité</p>
                                <div className="flex flex-wrap gap-2">
                                    {SEVERITIES.map(s => (
                                        <button key={s} onClick={() => toggleFilter('severity', s)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                                                    filters.severity.includes(s) ? 'bg-brand-50 text-brand-600 border-brand-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                                                }`}>{s}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Filtre Statut */}
                            <div className="flex-1">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Statut</p>
                                <div className="flex flex-wrap gap-2">
                                    {STATUSES.map(s => (
                                        <button key={s} onClick={() => toggleFilter('status', s)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                                                    filters.status.includes(s) ? 'bg-brand-50 text-brand-600 border-brand-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                                                }`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Filtre Période */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Date début</p>
                                <input type="datetime-local" value={filters.from}
                                       onChange={e => { setPage(0); setFilters(p => ({ ...p, from: e.target.value })); }}
                                       className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Date fin</p>
                                <input type="datetime-local" value={filters.to}
                                       onChange={e => { setPage(0); setFilters(p => ({ ...p, to: e.target.value })); }}
                                       className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600" />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tableau des alertes ─────────────────────── */}
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
                                    <th className="px-6 py-4 text-center">Sévérité</th>
                                    <th className="px-6 py-4">Agent</th>
                                    <th className="px-6 py-4">Source</th>
                                    <th className="px-6 py-4">Règle</th>
                                    <th className="px-6 py-4">Message</th>
                                    <th className="px-6 py-4 text-center">Statut</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                {alerts.map(a => (
                                    <tr key={a.id} onClick={() => openDetail(a.id)}
                                        className={`cursor-pointer hover:bg-gray-50/50 transition-colors ${
                                            selectedAlertId === a.id ? 'bg-brand-50/30' : ''
                                        } ${a._isNew ? 'animate-flash' : ''}`}>
                                        <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">
                                            {new Date(a.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-3.5 text-center"><SeverityBadge severity={a.severity} /></td>
                                        <td className="px-6 py-3.5 text-gray-700 font-medium">{a.agent?.hostname || '—'}</td>
                                        <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">{a.sourceType || '—'}</td>
                                        <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">{a.ruleId}</td>
                                        <td className="px-6 py-3.5 text-gray-700 max-w-xs truncate">{a.message}</td>
                                        <td className="px-6 py-3.5 text-center"><StatusBadge status={a.status} /></td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            <div className="px-6 py-4">
                                <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ════════════════════════════════════════════════
                PARTIE DROITE : Panneau de détail (contrat §2.2)
                ════════════════════════════════════════════════ */}
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
                                <button onClick={closeDetail} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>

                            {/* Message complet */}
                            <div>
                                <p className="text-sm font-medium text-gray-900 leading-relaxed">{alertDetail.alert.message}</p>
                                <p className="text-xs text-gray-400 mt-2">{new Date(alertDetail.alert.createdAt).toLocaleString('fr-FR')}</p>
                            </div>

                            {/* Justification (si faux positif) */}
                            {alertDetail.alert.justification && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1">Justification faux positif</p>
                                    <p className="text-sm text-amber-800">{alertDetail.alert.justification}</p>
                                </div>
                            )}

                            {/* Payload brut */}
                            {alertDetail.sourceEvent && (
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Payload brut</p>
                                    <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto leading-relaxed font-mono">
                                        {alertDetail.sourceEvent.payload}
                                    </pre>
                                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                                        <span>Collecté : {new Date(alertDetail.sourceEvent.collectedAt).toLocaleString('fr-FR')}</span>
                                        <span>Reçu : {new Date(alertDetail.sourceEvent.receivedAt).toLocaleString('fr-FR')}</span>
                                    </div>
                                </div>
                            )}

                            {/* Info agent */}
                            {alertDetail.agent && (
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Agent source</p>
                                    <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
                                        <p><span className="text-gray-400">Hostname :</span>{' '}<span className="font-medium text-gray-700">{alertDetail.agent.hostname}</span></p>
                                        <p><span className="text-gray-400">OS :</span>{' '}<span className="text-gray-700">{alertDetail.agent.osName} {alertDetail.agent.osVersion}</span></p>
                                        <p className="font-mono text-xs text-gray-400">{alertDetail.agent.agentId}</p>
                                    </div>
                                </div>
                            )}

                            {/* Alertes liées */}
                            {alertDetail.relatedAlerts?.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Alertes récentes du même agent ({alertDetail.relatedAlerts.length})
                                    </p>
                                    <div className="space-y-2">
                                        {alertDetail.relatedAlerts.map(ra => (
                                            <div key={ra.id} onClick={() => openDetail(ra.id)}
                                                 className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                                                <SeverityBadge severity={ra.severity} />
                                                <p className="text-xs text-gray-600 truncate flex-1">{ra.message}</p>
                                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                                    {new Date(ra.createdAt).toLocaleTimeString('fr-FR')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ════════════════════════════════════════
                                BOUTONS D'ACTION — L1 uniquement
                                ════════════════════════════════════════ */}
                            {isL1 && (alertDetail.alert.status === 'NEW' || alertDetail.alert.status === 'ACKNOWLEDGED') && (
                                <div className="border-t border-gray-100 pt-6 space-y-3">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Actions</p>

                                    {/* Acquitter — seulement si NEW */}
                                    {alertDetail.alert.status === 'NEW' && (
                                        <button onClick={() => requestAcknowledge(alertDetail.alert.id)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors cursor-pointer">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Acquitter
                                        </button>
                                    )}

                                    {/* Faux positif — NEW ou ACKNOWLEDGED */}
                                    <button onClick={() => openFPModal(alertDetail.alert.id)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                                        <XCircle className="w-4 h-4" />
                                        Faux positif
                                    </button>

                                    {/* Escalader — désactivé (Module 2) */}
                                    <button disabled title="Disponible au prochain module"
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-400 text-sm font-medium rounded-xl border border-gray-100 bg-gray-50 cursor-not-allowed">
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

            {/* ════════════════════════════════════════════════
                MODALES (fichiers séparés)
                ════════════════════════════════════════════════ */}

            {/* Modale de confirmation pour l'acquittement */}
            <ConfirmModal
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                confirmText={confirmDialog.confirmText}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={executeAcknowledge}
            />

            {/* Modale de faux positif avec justification */}
            <FalsePositiveModal
                isOpen={fpModal.isOpen}
                onClose={() => setFpModal({ isOpen: false, alertId: null })}
                onConfirm={handleFalsePositive}
                submitting={fpSubmitting}
                error={fpError}
            />
        </div>
    );
}