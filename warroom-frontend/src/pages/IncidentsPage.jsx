// /src/pages/IncidentsPage.jsx

// ══════════════════════════════════════════════════════════════
//  GESTION DES INCIDENTS — Module 2
// ══════════════════════════════════════════════════════════════
//
//  C'est LA page centrale du L2. Elle implémente :
//    - Liste paginée avec filtres (GET /api/incidents)      (contrat §2.2)
//    - Détail complet + timeline (GET /api/incidents/{id})  (contrat §2.3)
//    - Prendre en charge (PUT .../take)                     (contrat §2.4)
//    - Changer le statut (PUT .../status)                   (contrat §2.5)
//    - Réassigner (PUT .../reassign)                        (contrat §2.6)
//    - Renvoyer au L1 (PUT .../return-to-l1)                (contrat §2.7)
//    - Clôturer (PUT .../close)                             (contrat §2.8)
//    - Ajouter une note (POST .../notes)                    (contrat §3 — Notes)
//
//  Rôles :
//    - L2 : toutes les actions (si assigné)
//    - L1 : lecture seule + ajouter note (si créateur)
//    - MANAGER : lecture + réassigner + ajouter note
//
//  Le bouton "Ajouter une contre-mesure" est présent mais
//  désactivé — il sera activé au Module 3.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import AlertSeverityBadge from '../components/ui/alerts/AlertSeverityBadge.jsx';
import IncidentStatusBadge from '../components/ui/incidents/IncidentStatusBadge.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import IncidentDetailModal from '../components/modals/incidents/IncidentDetailModal.jsx';
import ConfirmModal from '../components/modals/ConfirmModal.jsx';
import StatusChangeModal from '../components/modals/incidents/StatusChangeModal.jsx';
import ReassignModal from '../components/modals/incidents/ReassignModal.jsx';
import ReturnToL1Modal from '../components/modals/incidents/ReturnToL1Modal.jsx';
import CloseIncidentModal from '../components/modals/incidents/CloseIncidentModal.jsx';
import AddNoteModal from '../components/modals/incidents/AddNoteModal.jsx';
import CountermeasureModal from '../components/modals/incidents/CountermeasureModal.jsx';
import { appConfig } from '../config/appConfig';
import {
    mockGetIncidents,
    mockGetIncidentDetail,
    mockTakeIncident,
    mockChangeStatus,
    mockReassignIncident,
    mockReturnToL1,
    mockCloseIncident,
    mockAddNote,
    mockAddCountermeasure,
    mockGetL2Users,
    getAllowedTransitions,
} from '../api/mock/mockIncidents.js';
import {
    Search,
    Filter,
    Loader2,
    RotateCcw,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION DE L'ENVIRONNEMENT
// true = Utilise les fausses données (pour coder l'UI)
// false = Utilise le vrai backend Spring Boot
// ══════════════════════════════════════════════════════════════
const USE_MOCK_API = appConfig.useMockApi;

// ── Valeurs possibles pour les filtres ────────────────────
const INCIDENT_STATUSES = ['OPEN', 'INVESTIGATING', 'REMEDIATING', 'RESOLVED', 'CLOSED', 'CLOSED_FALSE_POSITIVE'];
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const PAGE_SIZE = 20;

export default function IncidentsPage() {
    const { user } = useAuth();
    const role = user?.role;
    const isL2 = role === 'L2';
    const isL1 = role === 'L1';
    const isManager = role === 'MANAGER';

    // ══════════════════════════════════════════════════════════
    //  ÉTAT DE LA LISTE
    // ══════════════════════════════════════════════════════════
    const [incidents, setIncidents] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loadingList, setLoadingList] = useState(true);

    // ══════════════════════════════════════════════════════════
    //  FILTRES (contrat §2.2)
    // ══════════════════════════════════════════════════════════
    const [filters, setFilters] = useState({
        status: [],
        severity: [],
        assignedTo: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState(isL2 ? 'mine' : 'all'); // L2 voit ses incidents par défaut

    // ══════════════════════════════════════════════════════════
    //  PANNEAU DE DÉTAIL (contrat §2.3)
    // ══════════════════════════════════════════════════════════
    const [selectedIncidentId, setSelectedIncidentId] = useState(null);
    const [incidentDetail, setIncidentDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // ══════════════════════════════════════════════════════════
    //  L2 USERS (pour réassignation / escalade)
    // ══════════════════════════════════════════════════════════
    const [l2Users, setL2Users] = useState([]);

    // ══════════════════════════════════════════════════════════
    //  MODALES
    // ══════════════════════════════════════════════════════════
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false, title: '', message: '', type: 'success', confirmText: '',
    });
    const [statusModal, setStatusModal] = useState({ isOpen: false });
    const [reassignModal, setReassignModal] = useState({ isOpen: false });
    const [returnModal, setReturnModal] = useState({ isOpen: false });
    const [closeModal, setCloseModal] = useState({ isOpen: false });
    const [noteModal, setNoteModal] = useState({ isOpen: false });
    const [cmModal, setCmModal] = useState({ isOpen: false });
    const [modalSubmitting, setModalSubmitting] = useState(false);
    const [modalError, setModalError] = useState(null);

    // ══════════════════════════════════════════════════════════
    //  CHARGEMENT DES L2 (pour les dropdowns)
    // ══════════════════════════════════════════════════════════
    useEffect(() => {
        const loadL2Users = async () => {
            try {
                if (USE_MOCK_API) {
                    const users = await mockGetL2Users();
                    setL2Users(users);
                } else {
                    // Le backend n'a pas d'endpoint dédié — on filtre depuis la liste users
                    const res = await api.get('/api/admin/users');
                    setL2Users(res.data.filter(u => u.role === 'L2' && u.active).map(u => ({
                        userId: u.userId, fullName: u.fullName,
                    })));
                }
            } catch (err) {
                console.error('Erreur chargement L2 :', err);
            }
        };
        loadL2Users();
    }, []);

    // ══════════════════════════════════════════════════════════
    //  CHARGEMENT DE LA LISTE D'INCIDENTS
    // ══════════════════════════════════════════════════════════
    const fetchIncidents = useCallback(async () => {
        setLoadingList(true);
        try {
            if (USE_MOCK_API) {
                const data = await mockGetIncidents({
                    page,
                    size: PAGE_SIZE,
                    status: filters.status,
                    severity: filters.severity,
                    assignedTo: (isL2 && viewMode === 'mine') ? user?.userId : (filters.assignedTo || null),
                });
                setIncidents(data.content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
            } else {
                const params = new URLSearchParams();
                params.append('page', page);
                params.append('size', PAGE_SIZE);
                filters.status.forEach(s => params.append('status', s));
                filters.severity.forEach(s => params.append('severity', s));
                if (isL2 && viewMode === 'mine') {
                    params.append('assignedTo', user?.userId);
                } else if (filters.assignedTo) {
                    params.append('assignedTo', filters.assignedTo);
                }

                const res = await api.get(`/api/incidents?${params.toString()}`);
                setIncidents(res.data.content);
                setTotalPages(res.data.totalPages);
                setTotalElements(res.data.totalElements);
            }
        } catch (err) {
            console.error('Erreur chargement incidents :', err);
        }
        setLoadingList(false);
    }, [page, filters, viewMode, isL2, user?.userId]);

    useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

    // ══════════════════════════════════════════════════════════
    //  CHARGEMENT DU DÉTAIL
    // ══════════════════════════════════════════════════════════
    const openDetail = async (incidentId) => {
        setSelectedIncidentId(incidentId);
        setLoadingDetail(true);
        try {
            if (USE_MOCK_API) {
                const data = await mockGetIncidentDetail(incidentId);
                setIncidentDetail(data);
            } else {
                const res = await api.get(`/api/incidents/${incidentId}`);
                setIncidentDetail(res.data);
            }
        } catch (err) {
            console.error('Erreur chargement détail :', err);
        }
        setLoadingDetail(false);
    };

    const closeDetail = () => {
        setSelectedIncidentId(null);
        setIncidentDetail(null);
    };

    // Recharger le détail après une action
    const refreshDetail = async () => {
        if (selectedIncidentId) {
            await openDetail(selectedIncidentId);
        }
    };

    // ══════════════════════════════════════════════════════════
    //  ACTION : PRENDRE EN CHARGE (via ConfirmModal)
    // ══════════════════════════════════════════════════════════
    const requestTake = () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Prendre en charge cet incident',
            message: 'Vous serez assigné à cet incident et le statut passera à "En investigation". Cette action est visible par toute l\'équipe.',
            type: 'success',
            confirmText: 'Prendre en charge',
        });
    };

    const executeTake = async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
            if (USE_MOCK_API) {
                await mockTakeIncident(selectedIncidentId, user?.userId, user?.fullName);
            } else {
                await api.put(`/api/incidents/${selectedIncidentId}/take`);
            }
            await refreshDetail();
            fetchIncidents();
        } catch (err) {
            const msg = err.response?.data?.message || 'Erreur lors de la prise en charge.';
            alert(msg);
        }
    };

    // ══════════════════════════════════════════════════════════
    //  ACTION : CHANGER LE STATUT (via StatusChangeModal)
    // ══════════════════════════════════════════════════════════
    const openStatusModal = () => {
        setModalError(null);
        setStatusModal({ isOpen: true });
    };

    const handleStatusChange = async (newStatus, note) => {
        setModalSubmitting(true);
        setModalError(null);
        try {
            if (USE_MOCK_API) {
                await mockChangeStatus(selectedIncidentId, newStatus, note);
            } else {
                await api.put(`/api/incidents/${selectedIncidentId}/status`, { newStatus, note });
            }
            setStatusModal({ isOpen: false });
            await refreshDetail();
            fetchIncidents();
        } catch (err) {
            setModalError(err.response?.data?.message || 'Erreur lors du changement de statut.');
        }
        setModalSubmitting(false);
    };

    // ══════════════════════════════════════════════════════════
    //  ACTION : RÉASSIGNER (via ReassignModal)
    // ══════════════════════════════════════════════════════════
    const openReassignModal = () => {
        setModalError(null);
        setReassignModal({ isOpen: true });
    };

    const handleReassign = async (newAssigneeUserId, note) => {
        setModalSubmitting(true);
        setModalError(null);
        try {
            if (USE_MOCK_API) {
                await mockReassignIncident(selectedIncidentId, newAssigneeUserId, note);
            } else {
                await api.put(`/api/incidents/${selectedIncidentId}/reassign`, { newAssigneeUserId, note });
            }
            setReassignModal({ isOpen: false });
            await refreshDetail();
            fetchIncidents();
        } catch (err) {
            setModalError(err.response?.data?.message || 'Erreur lors de la réassignation.');
        }
        setModalSubmitting(false);
    };

    // ══════════════════════════════════════════════════════════
    //  ACTION : RENVOYER AU L1 (via ReturnToL1Modal)
    // ══════════════════════════════════════════════════════════
    const openReturnModal = () => {
        setModalError(null);
        setReturnModal({ isOpen: true });
    };

    const handleReturnToL1 = async (justification) => {
        setModalSubmitting(true);
        setModalError(null);
        try {
            if (USE_MOCK_API) {
                await mockReturnToL1(selectedIncidentId, justification);
            } else {
                await api.put(`/api/incidents/${selectedIncidentId}/return-to-l1`, { justification });
            }
            setReturnModal({ isOpen: false });
            await refreshDetail();
            fetchIncidents();
        } catch (err) {
            setModalError(err.response?.data?.message || 'Erreur lors du renvoi.');
        }
        setModalSubmitting(false);
    };

    // ══════════════════════════════════════════════════════════
    //  ACTION : CLÔTURER (via CloseIncidentModal)
    // ══════════════════════════════════════════════════════════
    const openCloseModal = () => {
        setModalError(null);
        setCloseModal({ isOpen: true });
    };

    const handleClose = async (summary) => {
        setModalSubmitting(true);
        setModalError(null);
        try {
            if (USE_MOCK_API) {
                await mockCloseIncident(selectedIncidentId, summary);
            } else {
                await api.put(`/api/incidents/${selectedIncidentId}/close`, { summary });
            }
            setCloseModal({ isOpen: false });
            await refreshDetail();
            fetchIncidents();
        } catch (err) {
            setModalError(err.response?.data?.message || 'Erreur lors de la clôture.');
        }
        setModalSubmitting(false);
    };

    // ══════════════════════════════════════════════════════════
    //  ACTION : AJOUTER UNE NOTE (via AddNoteModal)
    // ══════════════════════════════════════════════════════════
    const openNoteModal = () => {
        setModalError(null);
        setNoteModal({ isOpen: true });
    };

    const handleAddNote = async (content) => {
        setModalSubmitting(true);
        setModalError(null);
        try {
            if (USE_MOCK_API) {
                await mockAddNote(selectedIncidentId, content, user?.fullName, user?.role);
            } else {
                await api.post(`/api/incidents/${selectedIncidentId}/notes`, { content });
            }
            setNoteModal({ isOpen: false });
            await refreshDetail();
        } catch (err) {
            setModalError(err.response?.data?.message || 'Erreur lors de l\'ajout de la note.');
        }
        setModalSubmitting(false);
    };

    // ══════════════════════════════════════════════════════════
    //  ACTION : AJOUTER UNE CONTRE-MESURE (Module 3)
    // ══════════════════════════════════════════════════════════
    const openCmModal = () => {
        setModalError(null);
        setCmModal({ isOpen: true });
    };

    const handleAddCountermeasure = async ({ type, description, technicalCommand }) => {
        setModalSubmitting(true);
        setModalError(null);
        try {
            let result;
            if (USE_MOCK_API) {
                result = await mockAddCountermeasure(selectedIncidentId, type, description, technicalCommand, user?.fullName, user?.role);
            } else {
                const res = await api.post(`/api/incidents/${selectedIncidentId}/countermeasures`, {
                    type, description, technicalCommand,
                });
                result = res.data;
            }

            setCmModal({ isOpen: false });
            await refreshDetail();
        } catch (err) {
            setModalError(err.response?.data?.message || 'Erreur lors de l\'ajout de la contre-mesure.');
        }
        setModalSubmitting(false);
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
        setFilters({ status: [], severity: [], assignedTo: '' });
    };

    const hasActiveFilters =
        filters.status.length > 0 || filters.severity.length > 0 || filters.assignedTo;

    // ══════════════════════════════════════════════════════════
    //  PERMISSIONS CONTEXTUELLES
    // ══════════════════════════════════════════════════════════
    const inc = incidentDetail?.incident;
    const isAssignedL2 = isL2 && inc?.assignedToUserId === user?.userId;
    const isCreatorL1 = isL1 && inc?.createdByUserId === user?.userId;
    const isIncidentActive = inc && !['CLOSED', 'CLOSED_FALSE_POSITIVE'].includes(inc.status);
    const isPoolIncident = inc?.status === 'OPEN' && !inc?.assignedToUserId;
    const allowedTransitions = inc ? getAllowedTransitions(inc.status) : [];

    // Qui peut ajouter une note ?
    const canAddNote = isAssignedL2 || isCreatorL1 || isManager;

    // ══════════════════════════════════════════════════════════
    //  RENDU
    // ══════════════════════════════════════════════════════════
    return (
        <div className="flex h-full">

            {/* ════════════════════════════════════════════════
                PARTIE GAUCHE : Liste des incidents
                ════════════════════════════════════════════════ */}
            <div className="flex-1 p-8 overflow-y-auto">

                {/* ── Header ─────────────────────────────────── */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestion des incidents</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {totalElements} incident{totalElements > 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {isL2 && (
                            <div className="relative flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50 p-0.5">
                                <div
                                    className="absolute top-0.5 bottom-0.5 rounded-lg bg-brand-100 shadow-sm border border-brand-200 transition-all duration-300 ease-in-out"
                                    style={{
                                        width: viewMode === 'mine' ? 'calc(65% - 2px)' : 'calc(35% - 2px)',
                                        left: viewMode === 'mine' ? '2px' : 'calc(65%)',
                                    }}
                                />
                                <button
                                    onClick={() => { setViewMode('mine'); setPage(0); }}
                                    className={`relative z-10 px-3 py-[7px] text-xs font-medium rounded-lg transition-colors duration-300 cursor-pointer flex-1 text-center whitespace-nowrap ${
                                        viewMode === 'mine' ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    Mes incidents
                                </button>
                                <button
                                    onClick={() => { setViewMode('all'); setPage(0); }}
                                    className={`relative z-10 px-3 py-[7px] text-xs font-medium rounded-lg transition-colors duration-300 cursor-pointer flex-1 text-center whitespace-nowrap ${
                                        viewMode === 'all' ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    Tous
                                </button>
                            </div>
                        )}

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
                                    {filters.status.length + filters.severity.length + (filters.assignedTo ? 1 : 0)}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Barre de filtres (dépliable) ───────────── */}
                {showFilters && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 space-y-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Filtre Statut */}
                            <div className="flex-1">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Statut</p>
                                <div className="flex flex-wrap gap-2">
                                    {INCIDENT_STATUSES.map(s => (
                                        <button key={s} onClick={() => toggleFilter('status', s)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                                                    filters.status.includes(s) ? 'bg-brand-50 text-brand-600 border-brand-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                                                }`}>
                                            {s === 'CLOSED_FALSE_POSITIVE' ? 'FAUX POSITIF' : s}
                                        </button>
                                    ))}
                                </div>
                            </div>

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
                        </div>
                    </div>
                )}

                {/* ── Tableau des incidents ─────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {loadingList ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                        </div>
                    ) : incidents.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <Search className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">Aucun incident trouvé</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">N°</th>
                                    <th className="px-6 py-4 text-center">Sévérité</th>
                                    <th className="px-6 py-4">Titre</th>
                                    <th className="px-6 py-4 text-center">Statut</th>
                                    <th className="px-6 py-4">Assigné à</th>
                                    <th className="px-6 py-4">Créé le</th>
                                    <th className="px-6 py-4">Mis à jour</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                {incidents.map(inc => (
                                    <tr key={inc.id} onClick={() => openDetail(inc.id)}
                                        className={`cursor-pointer hover:bg-gray-50/50 transition-colors ${
                                            selectedIncidentId === inc.id ? 'bg-brand-50/30' : ''
                                        }`}>
                                        <td className="px-6 py-3.5 font-mono text-xs text-brand-600 font-semibold whitespace-nowrap">
                                            {inc.incidentNumber}
                                        </td>
                                        <td className="px-6 py-3.5 text-center">
                                            <AlertSeverityBadge severity={inc.severity} />
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-700 max-w-xs truncate font-medium">
                                            {inc.title}
                                        </td>
                                        <td className="px-6 py-3.5 text-center">
                                            <IncidentStatusBadge status={inc.status} />
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-500">
                                            {inc.assignedToFullName || (
                                                <span className="text-amber-600 text-xs font-medium">Pool L2</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">
                                            {new Date(inc.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-400 whitespace-nowrap">
                                            {new Date(inc.updatedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </td>
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

            {/* ── Modale de détail ── */}
            <IncidentDetailModal
                isOpen={!!selectedIncidentId}
                incidentDetail={incidentDetail}
                loading={loadingDetail}
                onClose={closeDetail}

                // Actions
                onTake={requestTake}
                onChangeStatus={openStatusModal}
                onCloseIncident={openCloseModal}
                onAddCountermeasure={openCmModal}
                onReturnToL1={openReturnModal}
                onReassign={openReassignModal}
                onAddNote={openNoteModal}

                // Permissions
                isAssignedL2={isAssignedL2}
                isCreatorL1={isCreatorL1}
                isManager={isManager}
                isL2={isL2}
                isIncidentActive={isIncidentActive}
                isPoolIncident={isPoolIncident}
                canAddNote={canAddNote}
                allowedTransitions={allowedTransitions}
            />

            {/* ════════════════════════════════════════════════
                MODALES
                ════════════════════════════════════════════════ */}

            {/* Prise en charge */}
            <ConfirmModal
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                confirmText={confirmDialog.confirmText}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={executeTake}
            />

            {/* Changement de statut */}
            <StatusChangeModal
                isOpen={statusModal.isOpen}
                currentStatus={inc?.status}
                allowedTargets={allowedTransitions}
                onClose={() => setStatusModal({ isOpen: false })}
                onConfirm={handleStatusChange}
                submitting={modalSubmitting}
                error={modalError}
            />

            {/* Réassignation */}
            <ReassignModal
                isOpen={reassignModal.isOpen}
                l2Users={l2Users}
                currentAssigneeId={inc?.assignedToUserId}
                onClose={() => setReassignModal({ isOpen: false })}
                onConfirm={handleReassign}
                submitting={modalSubmitting}
                error={modalError}
            />

            {/* Renvoi au L1 */}
            <ReturnToL1Modal
                isOpen={returnModal.isOpen}
                onClose={() => setReturnModal({ isOpen: false })}
                onConfirm={handleReturnToL1}
                submitting={modalSubmitting}
                error={modalError}
            />

            {/* Clôture */}
            <CloseIncidentModal
                isOpen={closeModal.isOpen}
                onClose={() => setCloseModal({ isOpen: false })}
                onConfirm={handleClose}
                submitting={modalSubmitting}
                error={modalError}
            />

            {/* Note */}
            <AddNoteModal
                isOpen={noteModal.isOpen}
                onClose={() => setNoteModal({ isOpen: false })}
                onConfirm={handleAddNote}
                submitting={modalSubmitting}
                error={modalError}
            />

            {/* Contre-mesure — Module 3 */}
            <CountermeasureModal
                isOpen={cmModal.isOpen}
                isRemediating={inc?.status === 'REMEDIATING'}
                onClose={() => setCmModal({ isOpen: false })}
                onConfirm={handleAddCountermeasure}
                submitting={modalSubmitting}
                error={modalError}
            />
        </div>
    );
}