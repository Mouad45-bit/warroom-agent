'use client';
// /src/components/FalsePositiveModal.jsx

// ══════════════════════════════════════════════════════════════
//  MODALE FAUX POSITIF — Module 1
// ══════════════════════════════════════════════════════════════
//
//  Affiche un formulaire avec champ de justification obligatoire
//  (min 10 caractères). Cf. contrat d'API §2.4.
//
//  Props :
//    - isOpen      : booléen, affiche/cache la modale
//    - onClose     : callback de fermeture
//    - onConfirm   : (justification: string) => void
//    - submitting  : booléen, désactive le bouton pendant l'envoi
//    - error       : message d'erreur à afficher (ou null)
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

export default function FalsePositiveModal({ isOpen, onClose, onConfirm, submitting = false, error = null }) {
    const [justification, setJustification] = useState('');

    // Réinitialiser le champ à chaque ouverture
    useEffect(() => {
        if (isOpen) setJustification('');
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        onConfirm(justification);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Qualifier en faux positif
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                    Expliquez pourquoi cette alerte n'est pas une vraie menace. Cette
                    justification sera auditée par le Manager.
                </p>

                {/* Message d'erreur */}
                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm mb-4">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                {/* Champ justification */}
                <textarea
                    rows={4}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Ex : Processus de compilation Maven en cours, consommation CPU normale pour cette opération."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                />
                <p className={`text-xs mt-1 ${justification.length >= 10 ? 'text-green-500' : 'text-gray-400'}`}>
                    {justification.length}/10 caractères minimum
                </p>

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
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
    );
}