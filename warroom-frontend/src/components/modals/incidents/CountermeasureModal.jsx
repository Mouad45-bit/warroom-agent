// /src/components/modals/incidents/CountermeasureModal.jsx

// ══════════════════════════════════════════════════════════════
//  MODALE AJOUT DE CONTRE-MESURE — Module 3
// ══════════════════════════════════════════════════════════════
//
//  Le L2 assigné documente une action de remédiation :
//    - Type (liste déroulante des 7 types autorisés)
//    - Description obligatoire (min 5 caractères)
//    - Commande technique optionnelle (affiché en monospace)
//
//  Si l'incident N'EST PAS en statut REMEDIATING, un bandeau
//  d'avertissement jaune est affiché (mais n'empêche pas l'action).
//
//  Contrat d'API : POST /api/incidents/{id}/countermeasures
//  Request : { type, description, technicalCommand }
//  Réponse : { id, message, warning? }
//
//  Props :
//    - isOpen        : booléen
//    - isRemediating : booléen (pour l'avertissement)
//    - onClose       : callback
//    - onConfirm     : ({ type, description, technicalCommand }) => void
//    - submitting    : booléen
//    - error         : message d'erreur ou null
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, ShieldPlus } from 'lucide-react';
import { ACTION_THEME } from '../../../config/actionTheme.js';

// ── Types de contre-mesures (contrat §3.1.2) ────────────────
const COUNTERMEASURE_TYPES = [
    { value: 'BLOCK_IP',           label: 'Blocage IP' },
    { value: 'DISABLE_ACCOUNT',    label: 'Désactivation de compte' },
    { value: 'ISOLATE_MACHINE',    label: 'Isolation de machine' },
    { value: 'APPLY_PATCH',        label: 'Patch appliqué' },
    { value: 'RESTART_SERVICE',    label: 'Redémarrage de service' },
    { value: 'FIREWALL_RULE',      label: 'Modification règle firewall' },
    { value: 'OTHER',              label: 'Autre' },
];

export default function CountermeasureModal
    ({
         isOpen,
         isRemediating = true,
         onClose,
         onConfirm,
         submitting = false,
         error = null,
     }) {
    const [type, setType] = useState('BLOCK_IP');
    const [description, setDescription] = useState('');
    const [technicalCommand, setTechnicalCommand] = useState('');

    // Réinitialiser les champs à chaque ouverture
    useEffect(() => {
        if (isOpen) {
            setType('BLOCK_IP');
            setDescription('');
            setTechnicalCommand('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const theme = ACTION_THEME.countermeasure;

    const handleSubmit = () => {
        if (description.length < 5) return;
        onConfirm({
            type,
            description,
            technicalCommand: technicalCommand.trim() || null,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${theme.iconBg}`}>
                            <ShieldPlus className={`w-5 h-5 ${theme.iconText}`} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Ajouter une contre-mesure
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Avertissement si pas en REMEDIATING */}
                {!isRemediating && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-4">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <div>
                            <p className="font-medium">L'incident n'est pas en phase de remédiation.</p>
                            <p className="text-xs text-amber-600 mt-0.5">Vous pouvez ajouter une contre-mesure urgente, mais pensez à changer le statut ensuite.</p>
                        </div>
                    </div>
                )}

                {/* Erreur API */}
                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm mb-4">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                <div className="space-y-4">

                    {/* Type de contre-mesure */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 bg-white"
                        >
                            {COUNTERMEASURE_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Ex : Blocage de l'IP source 192.168.1.50 sur le firewall périmétrique."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                        <p className={`text-xs mt-1 ${description.length >= 5 ? 'text-green-500' : 'text-gray-400'}`}>
                            {description.length}/5 caractères minimum
                        </p>
                    </div>

                    {/* Commande technique (optionnel) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Commande technique <span className="text-gray-400 text-xs">(optionnel)</span>
                        </label>
                        <input
                            type="text"
                            value={technicalCommand}
                            onChange={e => setTechnicalCommand(e.target.value)}
                            placeholder="iptables -A INPUT -s 192.168.1.50 -j DROP"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                    </div>
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
                        disabled={submitting || description.length < 5}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50 transition-colors cursor-pointer ${theme.button}`}
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Ajouter
                    </button>
                </div>
            </div>
        </div>
    );
}