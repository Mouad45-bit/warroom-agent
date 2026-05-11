// /src/components/AlertDetailModal.jsx

// ══════════════════════════════════════════════════════════════
//  MODALE DÉTAIL D'ALERTE — Module 1
// ══════════════════════════════════════════════════════════════
//
//  Modale centrée qui affiche le détail complet d'une alerte
//  (contrat d'API §2.2) :
//    - Badges sévérité + statut
//    - Message complet + horodatage
//    - Justification faux positif (si applicable)
//    - Payload brut dans un bloc <pre>
//    - Informations de l'agent source
//    - Alertes liées du même agent (cliquables)
//    - Boutons d'action L1 (Acquitter, Faux positif, Escalader)
//
//  NAVIGATION ENTRE ALERTES :
//    Quand l'utilisateur clique sur une alerte liée, on empile
//    l'alerte courante dans un historique (stack). Une flèche
//    retour apparaît en haut à gauche pour revenir en arrière.
//    Cela permet d'explorer le contexte sans perdre sa position.
//
//  Props :
//    - isOpen          : booléen
//    - alertDetail     : { alert, sourceEvent, agent, relatedAlerts } ou null
//    - loading         : booléen (spinner pendant le chargement)
//    - isL1            : booléen (affiche les boutons d'action si true)
//    - onClose         : () => void
//    - onNavigate      : (alertId) => void — charge une autre alerte
//    - onAcknowledge   : (alertId) => void — action d’acquittement
//    - onFalsePositive : (alertId) => void — ouvre la FalsePositiveModal
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import AlertSeverityBadge from '../../ui/alerts/AlertSeverityBadge.jsx';
import AlertStatusBadge from '../../ui/alerts/AlertStatusBadge.jsx';
import {
    X,
    Loader2,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    ArrowUpRight,
} from 'lucide-react';

export default function AlertDetailModal
    ({
         isOpen,
         alertDetail,
         loading,
         isL1,
         onClose,
         onNavigate,
         onAcknowledge,
         onFalsePositive,
         onEscalate,
     }) {
    // ══════════════════════════════════════════════════════════
    //  HISTORIQUE DE NAVIGATION
    // ══════════════════════════════════════════════════════════
    //  Stack d'IDs d'alertes. Quand on clique sur une alerte liée,
    //  l'ID courant est empilé. Le bouton "retour" dépile.
    //  La stack est vidée à la fermeture de la modale.
    const [history, setHistory] = useState([]);

    // Réinitialiser l'historique à chaque ouverture
    useEffect(() => {
        if (!isOpen) setHistory([]);
    }, [isOpen]);

    if (!isOpen) return null;

    // ── Navigation vers une alerte liée ─────────────────────
    // On empile l'alerte courante AVANT de naviguer
    const handleNavigateToRelated = (targetAlertId) => {
        if (alertDetail?.alert?.id) {
            setHistory(prev => [...prev, alertDetail.alert.id]);
        }
        onNavigate(targetAlertId);
    };

    // ── Retour à l'alerte précédente ────────────────────────
    const handleGoBack = () => {
        if (history.length === 0) return;
        const previousId = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1)); // Dépiler
        onNavigate(previousId);
    };

    const canGoBack = history.length > 0;
    const alert = alertDetail?.alert;
    const showActions = isL1 && alert && (alert.status === 'NEW' || alert.status === 'ACKNOWLEDGED');

    return (
        // ── Overlay ─────────────────────────────────────────
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            {/* ── Conteneur de la modale ─────────────────────
                 max-w-2xl pour une bonne largeur de lecture.
                 max-h-[85vh] + overflow-y-auto pour le scroll
                 si le contenu dépasse la hauteur de l'écran. */}
            <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">

                {/* ════════════════════════════════════════════
                    HEADER — fixe en haut de la modale
                    ════════════════════════════════════════════ */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Flèche retour (visible uniquement si navigation) */}
                        {canGoBack && (
                            <button
                                onClick={handleGoBack}
                                className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                title="Retour à l'alerte précédente"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-500" />
                            </button>
                        )}

                        {/* Badges + identifiant */}
                        {alert && (
                            <div>
                                <div className="flex items-center gap-2">
                                    <AlertSeverityBadge severity={alert.severity} />
                                    <AlertStatusBadge status={alert.status} />
                                </div>
                                <p className="text-xs text-gray-400 font-mono mt-1">
                                    {alert.ruleId} · #{alert.id}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Bouton fermer */}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
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
                    ) : alertDetail ? (
                        <div className="space-y-6">
                            {/* ── Message complet ────────────────── */}
                            <div>
                                <p className="text-sm font-medium text-gray-900 leading-relaxed">
                                    {alert.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                    {new Date(alert.createdAt).toLocaleString('fr-FR')}
                                </p>
                            </div>

                            {/* ── Justification faux positif ─────── */}
                            {alert.justification && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1">
                                        Justification faux positif
                                    </p>
                                    <p className="text-sm text-amber-800">{alert.justification}</p>
                                </div>
                            )}

                            {/* ── Payload brut ───────────────────── */}
                            {alertDetail.sourceEvent && (
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Payload brut
                                    </p>
                                    <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">
                                        {alertDetail.sourceEvent.payload}
                                    </pre>
                                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                                        <span>
                                            Collecté : {new Date(alertDetail.sourceEvent.collectedAt).toLocaleString('fr-FR')}
                                        </span>
                                        <span>
                                            Reçu : {new Date(alertDetail.sourceEvent.receivedAt).toLocaleString('fr-FR')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* ── Info agent ─────────────────────── */}
                            {alertDetail.agent && (
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Agent source
                                    </p>
                                    <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
                                        <p>
                                            <span className="text-gray-400">Hostname :</span>{' '}
                                            <span className="font-medium text-gray-700">{alertDetail.agent.hostname}</span>
                                        </p>
                                        <p>
                                            <span className="text-gray-400">OS :</span>{' '}
                                            <span className="text-gray-700">{alertDetail.agent.osName} {alertDetail.agent.osVersion}</span>
                                        </p>
                                        <p className="font-mono text-xs text-gray-400">{alertDetail.agent.agentId}</p>
                                    </div>
                                </div>
                            )}

                            {/* ── Alertes liées (cliquables) ─────── */}
                            {alertDetail.relatedAlerts?.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Alertes récentes du même agent ({alertDetail.relatedAlerts.length})
                                    </p>
                                    <div className="space-y-2">
                                        {alertDetail.relatedAlerts.map(ra => (
                                            <div
                                                key={ra.id}
                                                onClick={() => handleNavigateToRelated(ra.id)}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                                            >
                                                <AlertSeverityBadge severity={ra.severity} />
                                                <p className="text-xs text-gray-600 truncate flex-1">{ra.message}</p>
                                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                                    {new Date(ra.createdAt).toLocaleTimeString('fr-FR')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ════════════════════════════════════
                                BOUTONS D'ACTION — L1 uniquement
                                ════════════════════════════════════ */}
                            {showActions && (
                                <div className="border-t border-gray-100 pt-6 space-y-3">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Actions
                                    </p>

                                    {/* Acquitter — seulement si NEW */}
                                    {alert.status === 'NEW' && (
                                        <button
                                            onClick={() => onAcknowledge(alert.id)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors cursor-pointer"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Acquitter
                                        </button>
                                    )}

                                    {/* Faux positif — NEW ou ACKNOWLEDGED */}
                                    <button
                                        onClick={() => onFalsePositive(alert.id)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Faux positif
                                    </button>

                                    <button onClick={onEscalate}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-purple-700 text-sm font-medium rounded-xl border border-purple-200 hover:bg-purple-50 transition-colors cursor-pointer">
                                        <ArrowUpRight className="w-4 h-4" />
                                        Escalader en incident
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}