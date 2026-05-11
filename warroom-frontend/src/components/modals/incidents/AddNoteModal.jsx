// /src/components/AddNoteModal.jsx

// ══════════════════════════════════════════════════════════════
//  MODALE AJOUT DE NOTE — Module 2
// ══════════════════════════════════════════════════════════════
//
//  Permet au L2 (assigné), L1 (créateur), et Manager d'ajouter
//  une note à la timeline d'un incident. Les notes servent
//  à documenter des pistes d'investigation, du contexte
//  supplémentaire, ou des questions.
//
//  Props :
//    - isOpen     : booléen
//    - onClose    : callback
//    - onConfirm  : (content) => void
//    - submitting : booléen
//    - error      : message d'erreur ou null
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, MessageSquare } from 'lucide-react';

export default function AddNoteModal({
                                         isOpen,
                                         onClose,
                                         onConfirm,
                                         submitting = false,
                                         error = null,
                                     }) {
    const [content, setContent] = useState('');

    useEffect(() => {
        if (isOpen) setContent('');
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (content.length < 3) return;
        onConfirm(content);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100">
                            <MessageSquare className="w-5 h-5 text-gray-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Ajouter une note
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

                {/* Contenu */}
                <textarea
                    rows={4}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Partagez une observation, une piste d'investigation, ou une question..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                />

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
                        disabled={submitting || content.length < 3}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Ajouter
                    </button>
                </div>
            </div>
        </div>
    );
}