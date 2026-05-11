// /src/components/ReturnToL1Modal.jsx

// ══════════════════════════════════════════════════════════════
//  MODALE RENVOI AU L1 — Module 2
// ══════════════════════════════════════════════════════════════
//
//  Le L2 peut renvoyer un incident au L1 si l'escalade était
//  injustifiée. Le statut passe à CLOSED_FALSE_POSITIVE.
//  Une justification obligatoire est requise pour la boucle
//  de feedback L1 ↔ L2.
//
//  Props :
//    - isOpen     : booléen
//    - onClose    : callback
//    - onConfirm  : (justification) => void
//    - submitting : booléen
//    - error      : message d'erreur ou null
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, Undo2 } from 'lucide-react';
import { ACTION_THEME } from '../../../config/actionTheme.js';

export default function ReturnToL1Modal({
                                            isOpen,
                                            onClose,
                                            onConfirm,
                                            submitting = false,
                                            error = null,
                                        }) {
    const [justification, setJustification] = useState('');

    useEffect(() => {
        if (isOpen) setJustification('');
    }, [isOpen]);

    if (!isOpen) return null;

    const theme = ACTION_THEME.returnToL1;

    const handleSubmit = () => {
        if (justification.length < 10) return;
        onConfirm(justification);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${theme.iconBg}`}>
                            <Undo2 className={`w-5 h-5 ${theme.iconText}`} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Renvoyer au L1
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <p className="text-sm text-amber-800">
                        Cette action reclassifiera l'incident en <strong>faux positif</strong> et
                        notifiera le L1 qui a escaladé l'alerte. Les alertes liées seront également
                        marquées comme faux positif.
                    </p>
                </div>

                {/* Erreur */}
                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm mb-4">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                {/* Justification */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Justification <span className="text-red-400">*</span>
                    </label>
                    <textarea
                        rows={4}
                        value={justification}
                        onChange={e => setJustification(e.target.value)}
                        placeholder="Expliquez pourquoi ce n'est pas un vrai incident. Ex : L'IP 192.168.1.50 est celle du scanner Nessus interne."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                    />
                    <p className={`text-xs mt-1 ${justification.length >= 10 ? 'text-green-500' : 'text-gray-400'}`}>
                        {justification.length}/10 caractères minimum
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
                        disabled={submitting || justification.length < 10}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50 transition-colors cursor-pointer ${theme.button}`}
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Renvoyer comme faux positif
                    </button>
                </div>
            </div>
        </div>
    );
}