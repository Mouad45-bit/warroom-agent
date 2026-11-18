'use client';
// /src/pages/AlertsPage.jsx

// ══════════════════════════════════════════════════════════════
//  FILE D'ALERTES — Module 1
// ══════════════════════════════════════════════════════════════
//
//  Page clean : ne contient QUE la liste et les filtres.
//  Le détail est délégué à <AlertDetailModal /> (fichier séparé).
//
//  Fonctionnalités :
//    - Liste paginée avec tri sévérité DESC (contrat §2.1)
//    - 7 filtres combinables côté serveur
//    - Détail en modale centrée (contrat §2.2) → AlertDetailModal
//    - Acquittement avec confirmation (contrat §2.3) → ConfirmModal
//    - Faux positif avec justification (contrat §2.4) → FalsePositiveModal
//    - Alertes temps réel via SSE (contrat §2.6)
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import useSSE from '../hooks/useSSE';
import AlertSeverityBadge from '../components/ui/alerts/AlertSeverityBadge.jsx';
import AlertStatusBadge from '../components/ui/alerts/AlertStatusBadge.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import ConfirmModal from '../components/modals/ConfirmModal.jsx';
import FalsePositiveModal from '../components/modals/alerts/FalsePositiveModal.jsx';
import AlertDetailModal from '../components/modals/alerts/AlertDetailModal.jsx';
import {
    mockGetAlerts,
    mockGetAlertDetail,
    mockAcknowledgeAlert,
    mockFalsePositiveAlert
} from '../api/mock/mockAlerts.js';
//
import EscalateModal from '../components/modals/alerts/EscalateModal.jsx';
import {
    mockCreateIncident,
    mockGetL2Users,
} from '../api/mock/mockIncidents.js';

import { Search, Filter, Loader2, RotateCcw } from 'lucide-react';

//
const USE_MOCK_API = false;

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const STATUSES = ['NEW', 'ACKNOWLEDGED', 'FALSE_POSITIVE', 'ESCALATED'];
const PAGE_SIZE = 10;

export default function AlertsPage() {
    const { user } = useAuth();
    const isL1 = user?.role === 'L1';

    // ── Liste ────────────────────────────────────────────────
    const [alerts, setAlerts] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loadingList, setLoadingList] = useState(true);

    // ── Filtres ──────────────────────────────────────────────
    const [filters, setFilters] = useState({
        severity: [], status: [], sourceType: [], agentId: '', from: '', to: '',
    });
    const [showFilters, setShowFilters] = useState(false);

    // ── Modale de détail ─────────────────────────────────────
    const [detailOpen, setDetailOpen] = useState(false);
    const [alertDetail, setAlertDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // ── Modale confirmation acquittement ─────────────────────
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false, alertId: null, title: '', message: '', type: 'success', confirmText: '',
    });

    // ── Modale faux positif ──────────────────────────────────
    const [fpModal, setFpModal] = useState({ isOpen: false, alertId: null });
    const [fpError, setFpError] = useState(null);
    const [fpSubmitting, setFpSubmitting] = useState(false);

    // ══════════════════════════════════════════════════════════
    //  MODALE D'ESCALADE (Module 2)
    // ══════════════════════════════════════════════════════════
    const [escalateModal, setEscalateModal] = useState({
        isOpen: false,
        alert: null,
    });
    const [escalateError, setEscalateError] = useState(null);
    const [escalateSubmitting, setEscalateSubmitting] = useState(false);
    const [l2Users, setL2Users] = useState([]);

    // Charger les L2 au montage (pour le dropdown d'assignation)
    useEffect(() => {
        const loadL2Users = async () => {
            try {
                if (USE_MOCK_API) {
                    const users = await mockGetL2Users();
                    setL2Users(users);
                } else {
                    const res = await api.get('/api/incidents/l2-analysts');
                    setL2Users(res.data);
                }
            } catch (err) {
                console.error('Erreur chargement L2 :', err);
            }
        };
        loadL2Users();
    }, []);

    // ══════════════════════════════════════════════════════════
    //  CHARGEMENT LISTE
    // ══════════════════════════════════════════════════════════
    const fetchAlerts = useCallback(async () => {
        setLoadingList(true);
        try {
            if (USE_MOCK_API) {
                const data = await mockGetAlerts({
                    page, size: PAGE_SIZE,
                    severity: filters.severity, status: filters.status,
                    sourceType: filters.sourceType, agentId: filters.agentId,
                });
                setAlerts(data.content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
            } else {
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
        } catch (err) { console.error('Erreur chargement alertes :', err); }
        setLoadingList(false);
    }, [page, filters]);

    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

    // ── SSE temps réel ───────────────────────────────────────
    useSSE((newAlert) => {
        setAlerts(prev => [
            {
                ...newAlert,
                _isLatestSseAlert: true,
                _isPreviousSseAlert: false,
            },
            ...prev.map(alert => ({
                ...alert,

                // L'ancienne dernière devient avant-dernière
                _isPreviousSseAlert: alert._isLatestSseAlert === true,

                // Plus aucune ancienne alerte n'est la dernière
                _isLatestSseAlert: false,
            })),
        ]);

        setTotalElements(prev => prev + 1);
    });

    // ══════════════════════════════════════════════════════════
    //  DÉTAIL — ouvrir / naviguer / fermer
    // ══════════════════════════════════════════════════════════
    const loadAlertDetail = async (alertId) => {
        setLoadingDetail(true);
        try {
            const data = USE_MOCK_API
                ? await mockGetAlertDetail(alertId)
                : (await api.get(`/api/alerts/${alertId}`)).data;
            setAlertDetail(data);
        } catch (err) { console.error('Erreur détail :', err); }
        setLoadingDetail(false);
    };

    const openDetail = (alertId) => { setDetailOpen(true); loadAlertDetail(alertId); };
    const navigateDetail = (alertId) => { loadAlertDetail(alertId); };
    const closeDetail = () => { setDetailOpen(false); setAlertDetail(null); };

    // ══════════════════════════════════════════════════════════
    //  ACQUITTER
    // ══════════════════════════════════════════════════════════
    const requestAcknowledge = (alertId) => {
        setConfirmDialog({
            isOpen: true, alertId,
            title: 'Acquitter cette alerte',
            message: 'En acquittant, vous confirmez avoir pris connaissance de cette alerte. Cette action est irréversible.',
            type: 'success', confirmText: 'Acquitter',
        });
    };

    const executeAcknowledge = async () => {
        const { alertId } = confirmDialog;
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
            const result = USE_MOCK_API
                ? await mockAcknowledgeAlert(alertId)
                : (await api.put(`/api/alerts/${alertId}/acknowledge`)).data;
            setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'ACKNOWLEDGED', ...result } : a));
            if (alertDetail?.alert?.id === alertId) {
                setAlertDetail(prev => ({ ...prev, alert: { ...prev.alert, status: 'ACKNOWLEDGED', ...result } }));
            }
        } catch (err) { window.alert(err.message || 'Erreur.'); }
    };

    // ══════════════════════════════════════════════════════════
    //  FAUX POSITIF
    // ══════════════════════════════════════════════════════════
    const openFPModal = (alertId) => { setFpModal({ isOpen: true, alertId }); setFpError(null); };

    const handleFalsePositive = async (justification) => {
        setFpError(null);
        setFpSubmitting(true);
        try {
            const result = USE_MOCK_API
                ? await mockFalsePositiveAlert(fpModal.alertId, justification)
                : (await api.put(`/api/alerts/${fpModal.alertId}/false-positive`, { justification })).data;
            setAlerts(prev => prev.map(a => a.id === fpModal.alertId ? { ...a, status: 'FALSE_POSITIVE', ...result } : a));
            if (alertDetail?.alert?.id === fpModal.alertId) closeDetail();
            setFpModal({ isOpen: false, alertId: null });
        } catch (err) { setFpError(err.message || 'Erreur.'); }
        setFpSubmitting(false);
    };

    // ══════════════════════════════════════════════════════════
    //  ACTION : ESCALADER EN INCIDENT (Module 2)
    // ══════════════════════════════════════════════════════════
    const openEscalateModal = () => {
        if (!alertDetail?.alert) return;
        setEscalateError(null);
        setEscalateModal({ isOpen: true, alert: alertDetail.alert });
    };

    const handleEscalate = async ({ title, severity, triageNote, assignedToUserId, alertIds }) => {
        setEscalateError(null);
        setEscalateSubmitting(true);
        try {
            if (USE_MOCK_API) {
                await mockCreateIncident({ title, severity, triageNote, assignedToUserId, alertIds });
            } else {
                // Utilise l'endpoint raccourci depuis le détail d'alerte
                await api.put(`/api/alerts/${alertDetail.alert.id}/escalate`, {
                    title,
                    severity,
                    triageNote,
                    assignedToUserId,
                    additionalAlertIds: alertIds.filter(id => id !== alertDetail.alert.id),
                });
            }

            // Mise à jour locale : marquer les alertes comme escaladées
            setAlerts(prev => prev.map(a =>
                alertIds.includes(a.id) ? { ...a, status: 'ESCALATED' } : a
            ));

            // Fermer le détail et la modale
            closeDetail();
            setEscalateModal({ isOpen: false, alert: null });
        } catch (err) {
            setEscalateError(err.response?.data?.message || 'Erreur lors de l\'escalade.');
        }
        setEscalateSubmitting(false);
    };

    // ══════════════════════════════════════════════════════════
    //  FILTRES
    // ══════════════════════════════════════════════════════════
    const toggleFilter = (field, value) => {
        setPage(0);
        setFilters(prev => ({
            ...prev,
            [field]: prev[field].includes(value) ? prev[field].filter(v => v !== value) : [...prev[field], value],
        }));
    };
    const resetFilters = () => {
        setPage(0);
        setFilters({ severity: [], status: [], sourceType: [], agentId: '', from: '', to: '' });
    };
    const hasActiveFilters = filters.severity.length > 0 || filters.status.length > 0 ||
        filters.sourceType.length > 0 || filters.agentId || filters.from || filters.to;

    // ══════════════════════════════════════════════════════════
    //  RENDU
    // ══════════════════════════════════════════════════════════
    return (
        <div className="p-8 h-full overflow-y-auto">
            {/* ── Header ───────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">File d'alertes</h1>
                    <p className="text-sm text-gray-500 mt-1">{totalElements} alerte{totalElements > 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-2">
                    {hasActiveFilters && (
                        <button onClick={resetFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer">
                            <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
                        </button>
                    )}
                    <button onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-colors cursor-pointer ${showFilters ? 'bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-200' : 'text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
                        <Filter className="w-4 h-4" /> Filtres
                        {hasActiveFilters && <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-xs">{filters.severity.length + filters.status.length + (filters.agentId ? 1 : 0)}</span>}
                    </button>
                </div>
            </div>

            {/* ── Filtres ──────────────────────────────────────── */}
            {showFilters && (
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 space-y-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Sévérité</p>
                            <div className="flex flex-wrap gap-2">
                                {SEVERITIES.map(s => <button key={s} onClick={() => toggleFilter('severity', s)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${filters.severity.includes(s) ? 'bg-brand-50 text-brand-600 border-brand-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{s}</button>)}
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Statut</p>
                            <div className="flex flex-wrap gap-2">
                                {STATUSES.map(s => <button key={s} onClick={() => toggleFilter('status', s)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${filters.status.includes(s) ? 'bg-brand-50 text-brand-600 border-brand-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{s}</button>)}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Date début</p>
                            <input type="datetime-local" value={filters.from} onChange={e => { setPage(0); setFilters(p => ({ ...p, from: e.target.value })); }} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Date fin</p>
                            <input type="datetime-local" value={filters.to} onChange={e => { setPage(0); setFilters(p => ({ ...p, to: e.target.value })); }} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600" />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tableau ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {loadingList ? (
                    <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
                ) : alerts.length === 0 ? (
                    <div className="text-center py-20 text-gray-400"><Search className="w-10 h-10 mx-auto mb-3 text-gray-300" /><p className="text-sm">Aucune alerte trouvée</p></div>
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
                                <tr
                                    key={a.id}
                                    onClick={() => openDetail(a.id)}
                                    className={`cursor-pointer transition-colors ${
                                        a._isLatestSseAlert
                                            ? 'bg-amber-50 hover:bg-amber-100 border-l-4 border-amber-500 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.25)]'
                                            : a._isPreviousSseAlert
                                                ? 'bg-[#fffbeb]/60 hover:bg-amber-50 border-l-4 border-amber-200'
                                                : 'hover:bg-gray-50/50 border-l-4 border-transparent'
                                    }`}
                                >
                                    <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">{new Date(a.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                                    <td className="px-6 py-3.5 text-center"><AlertSeverityBadge severity={a.severity} /></td>
                                    <td className="px-6 py-3.5 text-gray-700 font-medium">{a.agent?.hostname || '—'}</td>
                                    <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">{a.sourceType || '—'}</td>
                                    <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">{a.ruleId}</td>
                                    <td className="px-6 py-3.5 text-gray-700 max-w-xs truncate">{a.message}</td>
                                    <td className="px-6 py-3.5 text-center"><AlertStatusBadge status={a.status} /></td>
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

            {/* ── Modales (fichiers séparés) ────────────────────── */}
            <AlertDetailModal
                isOpen={detailOpen}
                alertDetail={alertDetail}
                loading={loadingDetail}
                isL1={isL1}
                onClose={closeDetail}
                onNavigate={navigateDetail}
                onAcknowledge={requestAcknowledge}
                onFalsePositive={openFPModal}
                onEscalate={openEscalateModal}
            />

            <ConfirmModal
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                confirmText={confirmDialog.confirmText}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={executeAcknowledge}
            />

            <FalsePositiveModal
                isOpen={fpModal.isOpen}
                onClose={() => setFpModal({ isOpen: false, alertId: null })}
                onConfirm={handleFalsePositive}
                submitting={fpSubmitting}
                error={fpError}
            />

            <EscalateModal
                isOpen={escalateModal.isOpen}
                alert={escalateModal.alert}
                relatedAlerts={alertDetail?.relatedAlerts || []}
                l2Users={l2Users}
                onClose={() => setEscalateModal({ isOpen: false, alert: null })}
                onConfirm={handleEscalate}
                submitting={escalateSubmitting}
                error={escalateError}
            />
        </div>
    );
}