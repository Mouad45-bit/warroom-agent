// /src/components/CloseIncidentModal.jsx

// ══════════════════════════════════════════════════════════════
//  MODALE DE CLÔTURE — Module 2
// ══════════════════════════════════════════════════════════════
//
//  Le L2 clôture un incident en statut RESOLVED.
//  Un résumé de clôture obligatoire synthétise l'incident :
//  ce qui s'est passé, ce qui a été fait, l'état final,
//  et les recommandations éventuelles.
//
//  Props :
//    - isOpen     : booléen
//    - onClose    : callback
//    - onConfirm  : (summary) => void
//    - submitting : booléen
//    - error      : message d'erreur ou null
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { ACTION_THEME } from '../../../config/actionTheme.js';

export default function CloseIncidentModal({
                                               isOpen,
                                               onClose,
                                               onConfirm,
                                               submitting = false,
                                               error = null,
                                           }) {
    const [summary, setSummary] = useState('');

    useEffect(() => {
        if (isOpen) setSummary('');
    }, [isOpen]);

    if (!isOpen) return null;

    const theme = ACTION_THEME.closeIncident;

    const handleSubmit = () => {
        if (summary.length < 10) return;
        onConfirm(summary);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${theme.iconBg}`}>
                            <CheckCircle2 className={`w-5 h-5 ${theme.iconText}`} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Clôturer l'incident
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                    Rédigez un résumé de clôture qui synthétise l'incident : ce qui s'est
                    passé, les actions prises, l'état final, et vos recommandations.
                    Un incident clôturé est définitif et immuable.
                </p>

                {/* Erreur */}
                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm mb-4">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                {/* Résumé */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Résumé de clôture <span className="text-red-400">*</span>
                    </label>
                    <textarea
                        rows={5}
                        value={summary}
                        onChange={e => setSummary(e.target.value)}
                        placeholder="Ex : Brute-force stoppé. IP bloquée. Mot de passe root changé. Recommandation : désactiver l'accès SSH par mot de passe."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                    />
                    <p className={`text-xs mt-1 ${summary.length >= 10 ? 'text-green-500' : 'text-gray-400'}`}>
                        {summary.length}/10 caractères minimum
                    </p>
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || summary.length < 10}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50 transition-colors cursor-pointer ${theme.button}`}
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Clôturer définitivement
                    </button>
                </div>
            </div>
        </div>
    );
}