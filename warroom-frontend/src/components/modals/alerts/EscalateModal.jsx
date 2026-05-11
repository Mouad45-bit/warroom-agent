// /src/components/modals/alerts/EscalateModal.jsx

// ══════════════════════════════════════════════════════════════
//  MODALE D'ESCALADE — Module 2
// ══════════════════════════════════════════════════════════════
//
//  Formulaire de création d'incident depuis une alerte.
//  Pré-remplit le titre et la sévérité depuis l'alerte source.
//  Le L1 peut :
//    - Modifier le titre et la sévérité
//    - Écrire une note de triage (obligatoire)
//    - Assigner à un L2 spécifique ou au pool L2
//    - Cocher d'autres alertes du même agent pour regroupement
//
//  Props :
//    - isOpen       : booléen
//    - alert        : objet alerte source (id, ruleId, message, severity...)
//    - relatedAlerts: alertes récentes du même agent (pour regroupement)
//    - l2Users      : liste des L2 disponibles [{userId, fullName}]
//    - onClose      : callback de fermeture
//    - onConfirm    : ({title, severity, triageNote, assignedToUserId, alertIds}) => void
//    - submitting   : booléen
//    - error        : message d'erreur ou null
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, ArrowUpRight } from 'lucide-react';
import AlertSeverityBadge from "../../ui/alerts/AlertSeverityBadge.jsx";
import { ACTION_THEME } from '../../../config/actionTheme.js';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export default function EscalateModal({
                                          isOpen,
                                          alert,
                                          relatedAlerts = [],
                                          l2Users = [],
                                          onClose,
                                          onConfirm,
                                          submitting = false,
                                          error = null,
                                      }) {
    const [title, setTitle] = useState('');
    const [severity, setSeverity] = useState('HIGH');
    const [triageNote, setTriageNote] = useState('');
    const [assignedToUserId, setAssignedToUserId] = useState('');
    const [additionalAlertIds, setAdditionalAlertIds] = useState([]);

    // Pré-remplir depuis l'alerte source à chaque ouverture
    useEffect(() => {
        if (isOpen && alert) {
            setTitle(`${alert.ruleId} — ${alert.message}`.substring(0, 120));
            setSeverity(alert.severity || 'HIGH');
            setTriageNote('');
            setAssignedToUserId('');
            setAdditionalAlertIds([]);
        }
    }, [isOpen, alert]);

    if (!isOpen) return null;

    const theme = ACTION_THEME.escalate;

    const toggleAdditionalAlert = (alertId) => {
        setAdditionalAlertIds(prev =>
            prev.includes(alertId) ? prev.filter(id => id !== alertId) : [...prev, alertId]
        );
    };

    const handleSubmit = () => {
        const allAlertIds = [alert.id, ...additionalAlertIds];
        onConfirm({
            title,
            severity,
            triageNote,
            assignedToUserId: assignedToUserId ? Number(assignedToUserId) : null,
            alertIds: allAlertIds,
        });
    };

    // Alertes regroupables : même agent, pas déjà escaladées, pas l'alerte source
    const groupableAlerts = relatedAlerts.filter(
        ra => ra.id !== alert.id && ra.status !== 'ESCALATED' && ra.status !== 'FALSE_POSITIVE'
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${theme.iconBg}`}>
                            <ArrowUpRight className={`w-5 h-5 ${theme.iconText}`} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Escalader en incident
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Erreur */}
                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm mb-4">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                <div className="space-y-4">

                    {/* Titre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Titre de l'incident <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                    </div>

                    {/* Sévérité */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sévérité
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {SEVERITIES.map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setSeverity(s)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                                        severity === s
                                            ? 'bg-brand-50 text-brand-600 border-brand-200'
                                            : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Note de triage */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Note de triage <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={triageNote}
                            onChange={e => setTriageNote(e.target.value)}
                            placeholder="Décrivez ce que vous avez observé et pourquoi vous pensez que c'est un vrai incident..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                        <p className={`text-xs mt-1 ${triageNote.length >= 10 ? 'text-green-500' : 'text-gray-400'}`}>
                            {triageNote.length}/10 caractères minimum
                        </p>
                    </div>

                    {/* Assignation */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assigner à
                        </label>
                        <select
                            value={assignedToUserId}
                            onChange={e => setAssignedToUserId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 bg-white"
                        >
                            <option value="">Pool L2 (premier disponible)</option>
                            {l2Users.map(u => (
                                <option key={u.userId} value={u.userId}>
                                    {u.fullName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Alertes regroupables */}
                    {groupableAlerts.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Regrouper avec d'autres alertes
                            </label>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {groupableAlerts.map(ra => (
                                    <label
                                        key={ra.id}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={additionalAlertIds.includes(ra.id)}
                                            onChange={() => toggleAdditionalAlert(ra.id)}
                                            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                                        />
                                        <AlertSeverityBadge severity={ra.severity} />
                                        <span className="text-xs text-gray-600 truncate flex-1">{ra.message}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || triageNote.length < 10 || !title.trim()}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50 transition-colors cursor-pointer ${theme.button}`}
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Escalader
                    </button>
                </div>
            </div>
        </div>
    );
}