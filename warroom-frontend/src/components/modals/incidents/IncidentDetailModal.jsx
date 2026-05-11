// /src/components/modals/incidents/IncidentDetailModal.jsx

import { useState, useEffect } from 'react';
import AlertSeverityBadge from '../../ui/alerts/AlertSeverityBadge.jsx';
import IncidentStatusBadge from '../../ui/incidents/IncidentStatusBadge.jsx';
import { appConfig } from '../../../config/appConfig.js';
import {
    X,
    Loader2,
    ArrowRight,
    Undo2,
    UserCheck,
    MessageSquare,
    ShieldPlus,
    CheckCircle2,
} from 'lucide-react';

// ── Icônes et couleurs pour les types d'entrée de timeline ──
const TIMELINE_ENTRY_CONFIG = {
    STATUS_CHANGE: {
        icon: ArrowRight,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
    },
    NOTE: {
        icon: MessageSquare,
        bgColor: 'bg-gray-100',
        iconColor: 'text-gray-600',
    },
    COUNTERMEASURE: {
        icon: ShieldPlus,
        bgColor: 'bg-orange-100',
        iconColor: 'text-orange-600',
    },
    REASSIGNMENT: {
        icon: UserCheck,
        bgColor: 'bg-purple-100',
        iconColor: 'text-purple-600',
    },
    CLOSURE: {
        icon: CheckCircle2,
        bgColor: 'bg-green-100',
        iconColor: 'text-green-600',
    },
};

// ── Badge de rôle pour la timeline ──────────────────────────
function RoleBadge({ role }) {
    const styles = {
        L1: 'bg-blue-50 text-blue-600',
        L2: 'bg-brand-50 text-brand-600',
        MANAGER: 'bg-purple-50 text-purple-600',
        ADMIN: 'bg-gray-100 text-gray-600',
    };
    return (
        <span className={`inline-flex px-1.5 py-0.5 rounded ${appConfig.text.minMetaClass} font-semibold uppercase ${styles[role] || styles.L1}`}>
            {role}
        </span>
    );
}

export default function IncidentDetailModal
    ({
         isOpen,
         incidentDetail,
         loading,
         onClose,
         // Actions
         onTake,
         onChangeStatus,
         onCloseIncident,
         onAddCountermeasure,
         onReturnToL1,
         onReassign,
         onAddNote,
         // Permissions pré-calculées
         isAssignedL2 = false,
         isCreatorL1 = false,
         isManager = false,
         isL2 = false,
         isIncidentActive = false,
         isPoolIncident = false,
         canAddNote = false,
         allowedTransitions = [],
     }) {

    // État pour gérer l'onglet actif ('infos' ou 'timeline')
    const [activeTab, setActiveTab] = useState('infos');

    // Réinitialiser sur l'onglet 'infos' quand on ouvre la modale
    useEffect(() => {
        if (isOpen) {
            setActiveTab('infos');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const inc = incidentDetail?.incident;

    const hasAnyAction = isIncidentActive && (
        (isL2 && isPoolIncident) ||
        isAssignedL2 ||
        canAddNote ||
        isManager
    );

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-3xl max-h-[88vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">

                {/* ════════════════════════════════════════════
                    HEADER — fixe en haut de la modale
                    ════════════════════════════════════════════ */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div>
                        {inc && (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-bold text-brand-600">
                                        {inc.incidentNumber}
                                    </span>
                                    <AlertSeverityBadge severity={inc.severity} />
                                    <IncidentStatusBadge status={inc.status} />
                                </div>
                                <h2 className="text-base font-semibold text-gray-900 leading-snug mt-1">
                                    {inc.title}
                                </h2>
                            </>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0 self-start"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* ════════════════════════════════════════════
                    ONGLETS DE NAVIGATION
                    ════════════════════════════════════════════ */}
                {!loading && incidentDetail && (
                    <div className="flex px-6 border-b border-gray-100 shrink-0">
                        <button
                            onClick={() => setActiveTab('infos')}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                                activeTab === 'infos'
                                    ? 'border-brand-600 text-brand-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                            }`}
                        >
                            Informations
                        </button>
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                                activeTab === 'timeline'
                                    ? 'border-brand-600 text-brand-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                            }`}
                        >
                            Timeline ({incidentDetail.timeline?.length || 0})
                        </button>
                    </div>
                )}

                {/* ════════════════════════════════════════════
                    BODY — scrollable (Superposition via CSS Grid)
                    ════════════════════════════════════════════ */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 relative">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                        </div>
                    ) : incidentDetail ? (
                        <div className="grid grid-cols-1 items-start">

                            {/* ─────────────────────────────────────────────────────────────
                                ONGLET : INFORMATIONS & ACTIONS
                                ───────────────────────────────────────────────────────────── */}
                            <div
                                aria-hidden={activeTab !== 'infos'}
                                className={`col-start-1 row-start-1 space-y-6 transition-opacity duration-200 ${
                                    activeTab === 'infos'
                                        ? 'opacity-100 z-10'
                                        : 'opacity-0 invisible pointer-events-none'
                                }`}
                            >
                                {/* Infos générales */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-xs text-gray-400 mb-1">Assigné à</p>
                                        <p className="font-medium text-gray-700">
                                            {inc.assignedToFullName || (
                                                <span className="text-amber-600">Pool L2</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-xs text-gray-400 mb-1">Créé par</p>
                                        <p className="font-medium text-gray-700">{inc.createdByFullName}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-xs text-gray-400 mb-1">Créé le</p>
                                        <p className="text-gray-600">{new Date(inc.createdAt).toLocaleString('fr-FR')}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-xs text-gray-400 mb-1">Dernière MAJ</p>
                                        <p className="text-gray-600">{new Date(inc.updatedAt).toLocaleString('fr-FR')}</p>
                                    </div>
                                </div>

                                {/* Note de triage */}
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Note de triage
                                    </p>
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <p className="text-sm text-blue-800">{inc.triageNote}</p>
                                        <p className="text-xs text-blue-500 mt-2">— {inc.createdByFullName} (L1)</p>
                                    </div>
                                </div>

                                {/* Alertes sources */}
                                {incidentDetail.alerts?.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                            Alertes sources ({incidentDetail.alerts.length})
                                        </p>
                                        <div className="space-y-2">
                                            {incidentDetail.alerts.map(a => (
                                                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                                                    <AlertSeverityBadge severity={a.severity} />
                                                    <p className="text-xs text-gray-600 truncate flex-1">{a.message}</p>
                                                    <span className="text-xs text-gray-400 font-mono">{a.ruleId}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Boutons d'actions */}
                                {hasAnyAction && (
                                    <div className="border-t border-gray-100 pt-6 space-y-3">
                                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Actions</p>

                                        {isL2 && isPoolIncident && (
                                            <button onClick={onTake}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors cursor-pointer">
                                                <UserCheck className="w-4 h-4" /> Prendre en charge
                                            </button>
                                        )}

                                        {isAssignedL2 && allowedTransitions.length > 0 && (
                                            <button onClick={onChangeStatus}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors cursor-pointer">
                                                <ArrowRight className="w-4 h-4" /> Changer le statut
                                            </button>
                                        )}

                                        {isAssignedL2 && inc.status === 'RESOLVED' && (
                                            <button onClick={onCloseIncident}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors cursor-pointer">
                                                <CheckCircle2 className="w-4 h-4" /> Clôturer l'incident
                                            </button>
                                        )}

                                        {canAddNote && (
                                            <button onClick={onAddNote}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                                                <MessageSquare className="w-4 h-4" /> Ajouter une note
                                            </button>
                                        )}

                                        {/* Bouton de contre-mesure ACTIVÉ (Module 3) */}
                                        {isAssignedL2 && (
                                            <button onClick={onAddCountermeasure}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-orange-700 text-sm font-medium rounded-xl border border-orange-200 hover:bg-orange-50 transition-colors cursor-pointer">
                                                <ShieldPlus className="w-4 h-4" /> Ajouter une contre-mesure
                                            </button>
                                        )}

                                        {isAssignedL2 && (
                                            <button onClick={onReturnToL1}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-amber-700 text-sm font-medium rounded-xl border border-amber-200 hover:bg-amber-50 transition-colors cursor-pointer">
                                                <Undo2 className="w-4 h-4" /> Renvoyer au L1 (faux positif)
                                            </button>
                                        )}

                                        {isManager && (
                                            <button onClick={onReassign}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-purple-700 text-sm font-medium rounded-xl border border-purple-200 hover:bg-purple-50 transition-colors cursor-pointer">
                                                <UserCheck className="w-4 h-4" /> Réassigner
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ─────────────────────────────────────────────────────────────
                                ONGLET : TIMELINE
                                ───────────────────────────────────────────────────────────── */}
                            <div
                                aria-hidden={activeTab !== 'timeline'}
                                className={`col-start-1 row-start-1 transition-opacity duration-200 ${
                                    activeTab === 'timeline'
                                        ? 'opacity-100 z-10'
                                        : 'opacity-0 invisible pointer-events-none'
                                }`}
                            >
                                <div className="relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                                    <div className="space-y-4">
                                        {incidentDetail.timeline?.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic pl-12">Aucun évènement enregistré.</p>
                                        ) : (
                                            incidentDetail.timeline?.map((entry) => {
                                                const config = TIMELINE_ENTRY_CONFIG[entry.entryType] || TIMELINE_ENTRY_CONFIG.NOTE;
                                                const Icon = config.icon;

                                                return (
                                                    <div key={entry.id} className="relative flex gap-3 pl-0">
                                                        <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${config.bgColor} shrink-0`}>
                                                            <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0 pb-2">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {entry.authorFullName}
                                                                </span>
                                                                <RoleBadge role={entry.authorRole} />
                                                                <span className="text-xs text-gray-400">
                                                                    {new Date(entry.createdAt).toLocaleString('fr-FR', {
                                                                        day: '2-digit', month: '2-digit',
                                                                        hour: '2-digit', minute: '2-digit',
                                                                    })}
                                                                </span>
                                                            </div>

                                                            {entry.entryType === 'STATUS_CHANGE' && entry.oldStatus && (
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <IncidentStatusBadge status={entry.oldStatus} />
                                                                    <ArrowRight className="w-3 h-3 text-gray-400" />
                                                                    <IncidentStatusBadge status={entry.newStatus} />
                                                                </div>
                                                            )}

                                                            {entry.entryType === 'STATUS_CHANGE' && !entry.oldStatus && (
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <IncidentStatusBadge status={entry.newStatus} />
                                                                </div>
                                                            )}

                                                            {entry.entryType === 'CLOSURE' && entry.newStatus && (
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <IncidentStatusBadge status={entry.newStatus} />
                                                                </div>
                                                            )}

                                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                                {entry.content}
                                                            </p>

                                                            {entry.technicalCommand && (
                                                                <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto font-mono">
                                                                    {entry.technicalCommand}
                                                                </pre>
                                                            )}

                                                            {entry.countermeasureType && (
                                                                <span className={`inline-flex mt-1.5 px-2 py-0.5 rounded ${appConfig.text.minMetaClass} font-medium bg-orange-50 text-orange-600`}>
                                                                    {entry.countermeasureType.replace(/_/g, ' ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}