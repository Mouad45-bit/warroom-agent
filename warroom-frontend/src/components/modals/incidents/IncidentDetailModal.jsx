// /src/components/modals/incidents/IncidentDetailModal.jsx

// ══════════════════════════════════════════════════════════════
//  MODALE DÉTAIL D'INCIDENT — Module 2
// ══════════════════════════════════════════════════════════════
//
//  Modale centrée qui affiche le détail complet d'un incident
//  (contrat d'API §2.3). Même pattern que AlertDetailModal :
//    - Header fixe avec badges + bouton fermer
//    - Body scrollable avec le contenu complet
//    - Actions conditionnelles par rôle en bas
//
//  Contenu affiché :
//    - Badges sévérité + statut + numéro d'incident
//    - Infos générales (assigné, créateur, dates)
//    - Note de triage du L1
//    - Alertes sources liées
//    - Boutons d'action (selon rôle et statut)
//    - Timeline chronologique complète
//
//  Props :
//    - isOpen            : booléen
//    - incidentDetail    : { incident, alerts, timeline } ou null
//    - loading           : booléen (spinner pendant le chargement)
//    - onClose           : () => void
//
//    Actions L2 assigné :
//    - onTake            : () => void — prendre en charge (pool)
//    - onChangeStatus    : () => void — ouvre StatusChangeModal
//    - onCloseIncident   : () => void — ouvre CloseIncidentModal
//    - onAddCountermeasure : () => void — ouvre CountermeasureModal
//    - onReturnToL1      : () => void — ouvre ReturnToL1Modal
//
//    Action Manager :
//    - onReassign        : () => void — ouvre ReassignModal
//
//    Action commune :
//    - onAddNote         : () => void — ouvre AddNoteModal
//
//    Permissions pré-calculées (par IncidentsPage) :
//    - isAssignedL2      : booléen
//    - isCreatorL1       : booléen
//    - isManager         : booléen
//    - isL2              : booléen
//    - isIncidentActive  : booléen
//    - isPoolIncident    : booléen
//    - canAddNote        : booléen
//    - allowedTransitions: string[]
// ══════════════════════════════════════════════════════════════

import AlertSeverityBadge from '../../ui/alerts/AlertSeverityBadge.jsx';
import IncidentStatusBadge from '../../ui/incidents/IncidentStatusBadge.jsx';
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
        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${styles[role] || styles.L1}`}>
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
    if (!isOpen) return null;

    const inc = incidentDetail?.incident;

    return (
        // ── Overlay ─────────────────────────────────────────
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            {/* ── Conteneur de la modale ─────────────────────
                 max-w-2xl pour une bonne largeur de lecture.
                 max-h-[85vh] + overflow pour le scroll. */}
            <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">

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

                    {/* Bouton fermer */}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0 self-start"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* ════════════════════════════════════════════
                    BODY — scrollable
                    ════════════════════════════════════════════ */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                        </div>
                    ) : incidentDetail ? (
                        <div className="space-y-6">

                            {/* ── Infos générales ─────────────────── */}
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

                            {/* ── Note de triage ─────────────────── */}
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                    Note de triage
                                </p>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <p className="text-sm text-blue-800">{inc.triageNote}</p>
                                    <p className="text-xs text-blue-500 mt-2">— {inc.createdByFullName} (L1)</p>
                                </div>
                            </div>

                            {/* ── Alertes sources ────────────────── */}
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

                            {/* ════════════════════════════════════════
                                BOUTONS D'ACTION
                                ════════════════════════════════════════ */}
                            {isIncidentActive && (
                                <div className="border-t border-gray-100 pt-6 space-y-3">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Actions</p>

                                    {/* L2 : Prendre en charge (pool uniquement) */}
                                    {isL2 && isPoolIncident && (
                                        <button onClick={onTake}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors cursor-pointer">
                                            <UserCheck className="w-4 h-4" />
                                            Prendre en charge
                                        </button>
                                    )}

                                    {/* L2 assigné : Changer le statut */}
                                    {isAssignedL2 && allowedTransitions.length > 0 && (
                                        <button onClick={onChangeStatus}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors cursor-pointer">
                                            <ArrowRight className="w-4 h-4" />
                                            Changer le statut
                                        </button>
                                    )}

                                    {/* L2 assigné : Clôturer (si RESOLVED) */}
                                    {isAssignedL2 && inc.status === 'RESOLVED' && (
                                        <button onClick={onCloseIncident}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors cursor-pointer">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Clôturer l'incident
                                        </button>
                                    )}

                                    {/* Ajouter une note (L2, L1 créateur, Manager) */}
                                    {canAddNote && (
                                        <button onClick={onAddNote}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                                            <MessageSquare className="w-4 h-4" />
                                            Ajouter une note
                                        </button>
                                    )}

                                    {/* Ajouter une contre-mesure — désactivé (Module 3) */}
                                    {isAssignedL2 && (
                                        <button disabled title="Disponible au Module 3"
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-400 text-sm font-medium rounded-xl border border-gray-100 bg-gray-50 cursor-not-allowed">
                                            <ShieldPlus className="w-4 h-4" />
                                            Ajouter une contre-mesure
                                            <span className="text-xs opacity-60">(Module 3)</span>
                                        </button>
                                    )}

                                    {/* L2 assigné : Renvoyer au L1 */}
                                    {isAssignedL2 && (
                                        <button onClick={onReturnToL1}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-amber-700 text-sm font-medium rounded-xl border border-amber-200 hover:bg-amber-50 transition-colors cursor-pointer">
                                            <Undo2 className="w-4 h-4" />
                                            Renvoyer au L1 (faux positif)
                                        </button>
                                    )}

                                    {/* Manager : Réassigner */}
                                    {isManager && (
                                        <button onClick={onReassign}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-purple-700 text-sm font-medium rounded-xl border border-purple-200 hover:bg-purple-50 transition-colors cursor-pointer">
                                            <UserCheck className="w-4 h-4" />
                                            Réassigner
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* ════════════════════════════════════════
                                TIMELINE CHRONOLOGIQUE
                                ════════════════════════════════════════ */}
                            <div className="border-t border-gray-100 pt-6">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                                    Timeline ({incidentDetail.timeline?.length || 0})
                                </p>

                                <div className="relative">
                                    {/* Ligne verticale de la timeline */}
                                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

                                    <div className="space-y-4">
                                        {incidentDetail.timeline?.map((entry) => {
                                            const config = TIMELINE_ENTRY_CONFIG[entry.entryType] || TIMELINE_ENTRY_CONFIG.NOTE;
                                            const Icon = config.icon;

                                            return (
                                                <div key={entry.id} className="relative flex gap-3 pl-0">
                                                    {/* Icône de la timeline */}
                                                    <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${config.bgColor} shrink-0`}>
                                                        <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
                                                    </div>

                                                    {/* Contenu */}
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

                                                        {/* Transition de statut */}
                                                        {entry.entryType === 'STATUS_CHANGE' && entry.oldStatus && (
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <IncidentStatusBadge status={entry.oldStatus} />
                                                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                                                <IncidentStatusBadge status={entry.newStatus} />
                                                            </div>
                                                        )}

                                                        {/* Création initiale */}
                                                        {entry.entryType === 'STATUS_CHANGE' && !entry.oldStatus && (
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <IncidentStatusBadge status={entry.newStatus} />
                                                            </div>
                                                        )}

                                                        {/* Clôture avec transition */}
                                                        {entry.entryType === 'CLOSURE' && entry.newStatus && (
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <IncidentStatusBadge status={entry.newStatus} />
                                                            </div>
                                                        )}

                                                        {/* Contenu textuel */}
                                                        <p className="text-sm text-gray-600 leading-relaxed">
                                                            {entry.content}
                                                        </p>

                                                        {/* Commande technique (contre-mesures) */}
                                                        {entry.technicalCommand && (
                                                            <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto font-mono">
                                                                {entry.technicalCommand}
                                                            </pre>
                                                        )}

                                                        {/* Type de contre-mesure */}
                                                        {entry.countermeasureType && (
                                                            <span className="inline-flex mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-600">
                                                                {entry.countermeasureType.replace(/_/g, ' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
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