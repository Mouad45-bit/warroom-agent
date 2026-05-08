// /src/pages/UsersPage.jsx

// ══════════════════════════════════════════════════════════════
//  GESTION DES COMPTES — Module 0
// ══════════════════════════════════════════════════════════════
//
//  Page accessible aux rôles ADMIN et MANAGER (contrat §1.4-1.6).
//
//  Fonctionnalités :
//    - Lister les comptes (GET /api/admin/users)
//    - Créer un compte (POST /api/admin/users)
//    - Désactiver un compte (PUT /api/admin/users/{id}/disable)
//
//  Contraintes de rôle :
//    - MANAGER ne peut créer/désactiver que des L1 et L2
//    - ADMIN ne peut pas désactiver son propre compte
//    - On ne peut pas désactiver le dernier ADMIN
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    Users,
    UserPlus,
    X,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    ShieldOff,
} from 'lucide-react';

export default function UsersPage() {
    const { user: currentUser } = useAuth();

    // ── État ────────────────────────────────────────────────
    const [users, setUsers] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // ── Chargement de la liste ──────────────────────────────
    const fetchUsers = useCallback(async () => {
        setLoadingList(true);
        try {
            const res = await api.get('/api/admin/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Erreur chargement utilisateurs :', err);
        }
        setLoadingList(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // ── Désactivation d'un compte ───────────────────────────
    const handleDisable = async (userId) => {
        if (!window.confirm('Voulez-vous vraiment désactiver ce compte ?')) return;

        try {
            await api.put(`/api/admin/users/${userId}/disable`);
            // Recharger la liste pour refléter le changement
            fetchUsers();
        } catch (err) {
            const msg = err.response?.data?.message || 'Erreur lors de la désactivation.';
            alert(msg);
        }
    };

    // ── Les rôles que l'utilisateur connecté peut créer ─────
    // MANAGER → seulement L1 et L2 (contrat §1.5)
    // ADMIN → tous les rôles
    const creatableRoles =
        currentUser?.role === 'MANAGER'
            ? ['L1', 'L2']
            : ['L1', 'L2', 'MANAGER', 'ADMIN'];

    return (
        <div className="p-8">
            {/* ── Header de page ──────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    Gestion des comptes
                </h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    Créer un compte
                </button>
            </div>

            {/* ── Tableau des utilisateurs ────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {loadingList ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-4">Utilisateur</th>
                            <th className="px-6 py-4">Rôle</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Statut</th>
                            <th className="px-6 py-4">Dernière connexion</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                        {users.map((u) => (
                            <tr key={u.userId} className="hover:bg-gray-50/50 transition-colors">
                                {/* Nom + username */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-600 font-semibold text-xs">
                                            {u.fullName?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{u.fullName}</p>
                                            <p className="text-gray-400 text-xs">{u.username}</p>
                                        </div>
                                    </div>
                                </td>

                                {/* Rôle */}
                                <td className="px-6 py-4">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-600">
                      {u.role}
                    </span>
                                </td>

                                {/* Email */}
                                <td className="px-6 py-4 text-gray-500">
                                    {u.email || '—'}
                                </td>

                                {/* Statut actif/inactif */}
                                <td className="px-6 py-4">
                                    {u.active ? (
                                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Actif
                      </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-medium">
                        <ShieldOff className="w-3.5 h-3.5" />
                        Inactif
                      </span>
                                    )}
                                </td>

                                {/* Dernière connexion */}
                                <td className="px-6 py-4 text-gray-500">
                                    {u.lastLoginAt
                                        ? new Date(u.lastLoginAt).toLocaleString('fr-FR')
                                        : 'Jamais'}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 text-right">
                                    {u.active && u.userId !== currentUser?.userId && (
                                        <button
                                            onClick={() => handleDisable(u.userId)}
                                            className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline transition-colors"
                                        >
                                            Désactiver
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════
          MODALE DE CRÉATION DE COMPTE
          ══════════════════════════════════════════════════════ */}
            {showCreateModal && (
                <CreateUserModal
                    roles={creatableRoles}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        fetchUsers(); // Recharger la liste
                    }}
                />
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
//  MODALE DE CRÉATION — Sous-composant
// ══════════════════════════════════════════════════════════════
function CreateUserModal({ roles, onClose, onCreated }) {
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
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
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
                            type="password"
                            required
                            minLength={8}
                            value={form.password}
                            onChange={(e) => updateField('password', e.target.value)}
                            placeholder="Minimum 8 caractères"
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
                            className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
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