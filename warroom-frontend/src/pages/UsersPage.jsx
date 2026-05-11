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
//    - ADMIN ne peut activer/désactiver que [MANAGER, L1, L2] (ne peut pas toucher aux autres ADMIN)
//    - MANAGER ne peut activer/désactiver que [L1, L2]
// ══════════════════════════════════════════════════════════════

import {useState, useEffect, useCallback} from 'react';
import api from '../api/client';
import {useAuth} from '../context/AuthContext';
import CreateUserModal from '../components/modals/users/CreateUserModal.jsx';
import {appConfig} from '../config/appConfig.js';
import {useActionFeedback} from '../hooks/useActionFeedback.js';
import {
    mockGetUsers,
    mockDisableUser,
    mockEnableUser,
} from '../api/mock/mockAuth.js';
import {
    UserPlus,
    Loader2,
    CheckCircle2,
    ShieldOff,
} from 'lucide-react';

export default function UsersPage() {
    const {user: currentUser} = useAuth();
    const {confirmAction, showSuccess, showError} = useActionFeedback();

    // ── État ────────────────────────────────────────────────
    const [users, setUsers] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // ── Chargement de la liste ──────────────────────────────
    const fetchUsers = useCallback(async () => {
        setLoadingList(true);
        try {
            if (appConfig.useMockApi) {
                const data = await mockGetUsers();
                setUsers(data);
            } else {
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

    // ── Activation / désactivation d'un compte ──────────────
    const requestToggleUser = async (targetUser) => {
        const isCurrentlyActive = targetUser.active;
        const actionLabel = isCurrentlyActive ? 'désactiver' : 'activer';

        const confirmed = await confirmAction({
            title: isCurrentlyActive
                ? 'Désactiver cet utilisateur ?'
                : 'Activer cet utilisateur ?',
            message: `Voulez-vous vraiment ${actionLabel} le compte de ${targetUser.fullName} ?`,
            confirmText: isCurrentlyActive ? 'Désactiver' : 'Activer',
            variant: isCurrentlyActive ? 'disableUser' : 'activateUser',
        });

        if (!confirmed) return;

        await executeToggleUser(targetUser);
    };

    const executeToggleUser = async (targetUser) => {
        const isCurrentlyActive = targetUser.active;

        try {
            if (appConfig.useMockApi) {
                if (isCurrentlyActive) {
                    await mockDisableUser(targetUser.userId);
                } else {
                    await mockEnableUser(targetUser.userId);
                }
            } else {
                const endpoint = isCurrentlyActive ? 'disable' : 'enable';
                await api.put(`/api/admin/users/${targetUser.userId}/${endpoint}`);
            }

            await fetchUsers();

            showSuccess({
                title: isCurrentlyActive
                    ? 'Utilisateur désactivé'
                    : 'Utilisateur activé',
                message: `${targetUser.fullName} a bien été ${isCurrentlyActive ? 'désactivé' : 'activé'}.`,
            });
        } catch (err) {
            showError({
                title: 'Action impossible',
                message: err?.response?.data?.message || err.message || 'Impossible de modifier le statut de cet utilisateur.',
            });
        }
    };

    // ── Vérification des droits d'action sur un compte ──────
    const canToggleStatus = (targetRole) => {
        const currentRole = currentUser?.role;

        if (currentRole === 'ADMIN') {
            return ['MANAGER', 'L1', 'L2'].includes(targetRole);
        }
        if (currentRole === 'MANAGER') {
            return ['L1', 'L2'].includes(targetRole);
        }
        return false;
    };

    // ── Les rôles que l'utilisateur connecté peut créer ─────
    const creatableRoles =
        currentUser?.role === 'MANAGER'
            ? ['L1', 'L2']
            : ['L1', 'L2', 'MANAGER', 'ADMIN'];

    return (
        <div className="p-4 sm:p-5 lg:p-6">
            {/* ── Header de page ──────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    Gestion des comptes
                </h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors cursor-pointer"
                >
                    <UserPlus className="w-4 h-4"/>
                    Créer un compte
                </button>
            </div>

            {/* ── Tableau des utilisateurs ────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {loadingList ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-600"/>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-sm">
                            <thead>
                            <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                <th className="px-6 py-4">Utilisateur</th>
                                <th className="px-6 py-4 text-center">Rôle</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4">Dernière connexion</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                            {users.map((u) => (
                                <tr key={u.userId} className="hover:bg-gray-50/50 transition-colors">
                                    {/* Nom + username */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-600 font-semibold text-xs">
                                                {u.fullName?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{u.fullName}</p>
                                                <p className="text-gray-400 text-xs">{u.username}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Rôle */}
                                    <td className="px-6 py-4 text-center uppercase">
                                    <span
                                        className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-600">
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
                                            <span
                                                className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                            <CheckCircle2 className="w-3.5 h-3.5"/>
                                            Actif
                                        </span>
                                        ) : (
                                            <span
                                                className="inline-flex items-center gap-1 text-gray-400 text-xs font-medium">
                                            <ShieldOff className="w-3.5 h-3.5"/>
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
                                    <td className="px-6 py-4 text-left">
                                        {canToggleStatus(u.role) && (
                                            u.active ? (
                                                <button
                                                    onClick={() => requestToggleUser(u)}
                                                    className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline transition-colors cursor-pointer"
                                                >
                                                    Désactiver
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => requestToggleUser(u)}
                                                    className="text-xs font-medium text-green-600 hover:text-green-700 hover:underline transition-colors cursor-pointer"
                                                >
                                                    Activer
                                                </button>
                                            )
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════
             ══════════════════════════════════════════════════════ */}
            {/* Modale de création */}
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