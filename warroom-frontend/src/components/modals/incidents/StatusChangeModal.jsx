// /src/components/StatusChangeModal.jsx

// ══════════════════════════════════════════════════════════════
//  MODALE CHANGEMENT DE STATUT — Module 2
// ══════════════════════════════════════════════════════════════
//
//  Affiche les transitions autorisées depuis le statut actuel
//  sous forme de boutons sélectionnables + champ note obligatoire.
//
//  Transitions autorisées (contrat §1) :
//    OPEN → INVESTIGATING
//    INVESTIGATING → REMEDIATING
//    REMEDIATING → RESOLVED | INVESTIGATING (retour)
//    RESOLVED → CLOSED | REMEDIATING (retour)
//
//  Props :
//    - isOpen         : booléen
//    - currentStatus  : statut actuel de l'incident
//    - allowedTargets : tableau des statuts cibles autorisés
//    - onClose        : callback
//    - onConfirm      : (newStatus, note) => void
//    - submitting     : booléen
//    - error          : message d'erreur ou null
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, ArrowRight, Undo2 } from 'lucide-react';
import IncidentStatusBadge from '../../ui/incidents/IncidentStatusBadge.jsx';
import { ACTION_THEME } from '../../../config/actionTheme.js';
import { appConfig } from '../../../config/appConfig.js';

// Valeurs techniques affichées pour les statuts
const STATUS_LABELS = {
    INVESTIGATING: 'INVESTIGATING',
    REMEDIATING: 'REMEDIATING',
    RESOLVED: 'RESOLVED',
    CLOSED: 'CLOSED',
};

// Statuts considérés comme retour arrière
const BACK_TRANSITIONS = ['INVESTIGATING', 'REMEDIATING'];

export default function StatusChangeModal({
                                              isOpen,
                                              currentStatus,
                                              allowedTargets = [],
                                              onClose,
                                              onConfirm,
                                              submitting = false,
                                              error = null,
                                          }) {
    const [selectedStatus, setSelectedStatus] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedStatus('');
            setNote('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const theme = ACTION_THEME.takeIncident;
    const minJustificationChars = appConfig.minChars.statusJustification;
    const justificationLength = note.trim().length;
    const isJustificationValid = justificationLength >= minJustificationChars;

    const handleSubmit = () => {
        if (!selectedStatus || !isJustificationValid) return;
        onConfirm(selectedStatus, note);
    };

    // Déterminer si une transition est un retour arrière
    const isBackTransition = (target) => {
        if (currentStatus === 'REMEDIATING' && target === 'INVESTIGATING') return true;
        if (currentStatus === 'RESOLVED' && target === 'REMEDIATING') return true;
        return false;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Changer le statut
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Statut actuel */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-gray-500">Statut actuel :</span>
                    <IncidentStatusBadge status={currentStatus} />
                </div>

                {/* Erreur */}
                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm mb-4">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                {/* Transitions possibles */}
                <div className="space-y-2 mb-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Nouveau statut</p>
                    {allowedTargets.map(target => (
                        <button
                            key={target}
                            type="button"
                            onClick={() => setSelectedStatus(target)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                                selectedStatus === target
                                    ? 'border-brand-300 bg-brand-50'
                                    : 'border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {isBackTransition(target) ? (
                                    <Undo2 className="w-4 h-4 text-amber-500" />
                                ) : (
                                    <ArrowRight className="w-4 h-4 text-brand-600" />
                                )}
                                <span className="text-sm font-medium text-gray-700">
                                    {STATUS_LABELS[target] || target}
                                </span>
                            </div>
                            {isBackTransition(target) && (
                                <span className="text-xs text-amber-600 font-medium">Retour</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Note justificative */}
                {selectedStatus && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Note justificative <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Expliquez la raison de ce changement de statut..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                        <p className={`mt-1 text-xs ${isJustificationValid ? 'text-green-600' : 'text-gray-400'}`}>
                            {justificationLength}/{minJustificationChars} caractères minimum
                        </p>
                    </div>
                )}

                {/* Boutons */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !selectedStatus || !isJustificationValid}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50 transition-colors cursor-pointer ${theme.button}`}
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
    );
}