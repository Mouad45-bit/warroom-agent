'use client';
// /src/components/ReassignModal.jsx

// ══════════════════════════════════════════════════════════════
//  MODALE DE RÉASSIGNATION — Module 2
// ══════════════════════════════════════════════════════════════
//
//  Le Manager sélectionne un L2 dans la liste et ajoute une
//  note obligatoire expliquant la réassignation.
//
//  Props :
//    - isOpen      : booléen
//    - l2Users     : [{userId, fullName}]
//    - currentAssigneeId : userId actuellement assigné (pour l'exclure)
//    - onClose     : callback
//    - onConfirm   : (newAssigneeUserId, note) => void
//    - submitting  : booléen
//    - error       : message d'erreur ou null
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, UserCheck } from 'lucide-react';

export default function ReassignModal({
                                          isOpen,
                                          l2Users = [],
                                          currentAssigneeId,
                                          onClose,
                                          onConfirm,
                                          submitting = false,
                                          error = null,
                                      }) {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedUserId('');
            setNote('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!selectedUserId || note.length < 5) return;
        onConfirm(Number(selectedUserId), note);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100">
                            <UserCheck className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Réassigner l'incident
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
                    {/* Sélection L2 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nouvel analyste L2 <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 bg-white"
                        >
                            <option value="">Sélectionner un analyste...</option>
                            {l2Users
                                .filter(u => u.userId !== currentAssigneeId)
                                .map(u => (
                                    <option key={u.userId} value={u.userId}>
                                        {u.fullName}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Raison de la réassignation <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Ex : Réassigné car Sara est en congé..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
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
                        disabled={submitting || !selectedUserId || note.length < 5}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Réassigner
                    </button>
                </div>
            </div>
        </div>
    );
}