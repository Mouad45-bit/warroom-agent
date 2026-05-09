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
import CreateUserModal from '../components/CreateUserModal';
import { mockGetUsers, mockDisableUser } from '../api/mockAuth'; // <-- IMPORT DU MOCK
import {
    UserPlus,
    Loader2,
    CheckCircle2,
    ShieldOff,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION DE L'ENVIRONNEMENT
// true = Utilise les fausses données (pour coder l'UI)
// false = Utilise le vrai backend Spring Boot
// ══════════════════════════════════════════════════════════════
const USE_MOCK_API = true;

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
            if (USE_MOCK_API) {
                const data = await mockGetUsers();
                setUsers(data);
            } else {
                // VRAI APPEL API
                const res = await api.get('/api/admin/users');
                setUsers(res.data);
            }
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
            if (USE_MOCK_API) {
                await mockDisableUser(userId);
            } else {
                // VRAI APPEL API
                await api.put(`/api/admin/users/${userId}/disable`);
            }
            // Recharger la liste pour refléter le changement
            fetchUsers();
        } catch (err) {
            const msg = err.response?.data?.message || 'Erreur lors de la désactivation.';
            alert(msg);
        }
    };

    // ── Les rôles que l'utilisateur connecté peut créer ─────
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
              MODALE DE CRÉATION DE COMPTE (Composant importé)
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