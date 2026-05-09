// /src/components/CreateUserModal.jsx

import { useState } from 'react';
import api from '../api/client';
import { X, Loader2, AlertTriangle } from 'lucide-react';

// ══════════════════════════════════════════════════════════════
//  MODALE DE CRÉATION DE COMPTE (Module 0)
// ══════════════════════════════════════════════════════════════
export default function CreateUserModal({ roles, onClose, onCreated }) {
    const [form, setForm] = useState({
        username: '',
        password: '',
        fullName: '',
        role: roles[0], // Pré-sélectionne le premier rôle disponible
        email: '',
    });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Met à jour un champ du formulaire
    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            await api.post('/api/admin/users', form);
            onCreated(); // Ferme la modale et recharge la liste
        } catch (err) {
            const msg = err.response?.data?.message || 'Erreur lors de la création.';
            setError(msg);
        }
        setSubmitting(false);
    };

    return (
        // ── Overlay (fond semi-transparent) ───────────────────
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 mx-4">
                {/* Header de la modale */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Créer un compte
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Message d'erreur */}
                {error && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm mb-4">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nom complet */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nom complet <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={form.fullName}
                            onChange={(e) => updateField('fullName', e.target.value)}
                            placeholder="Ahmed Benali"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Identifiant <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={form.username}
                            onChange={(e) => updateField('username', e.target.value)}
                            placeholder="ahmed.l1"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                    </div>

                    {/* Mot de passe */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mot de passe <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            minLength={8}
                            value={form.password}
                            onChange={(e) => updateField('password', e.target.value)}
                            placeholder="ahmed123"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                    </div>

                    {/* Rôle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rôle <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={form.role}
                            onChange={(e) => updateField('role', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 bg-white"
                        >
                            {roles.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Email (optionnel) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email <span className="text-gray-400 text-xs">(optionnel)</span>
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            placeholder="ahmed@warroom.local"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                        />
                    </div>

                    {/* Boutons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Créer le compte
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}