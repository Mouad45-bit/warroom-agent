// /src/components/ProtectedRoute.jsx

// ══════════════════════════════════════════════════════════════
//  ROUTE PROTÉGÉE
// ══════════════════════════════════════════════════════════════
//
//  Ce composant enveloppe les routes qui nécessitent une session.
//  Il vérifie deux choses :
//    1. L'utilisateur est-il connecté ? (user != null)
//    2. Son rôle est-il autorisé ? (si allowedRoles est spécifié)
//
//  Usage dans le routeur :
//    <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
//      <Route path="/admin/users" element={<UsersPage />} />
//    </Route>
//
//  Si allowedRoles n'est pas précisé, tout utilisateur connecté
//  peut accéder à la route.
// ══════════════════════════════════════════════════════════════

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles }) {
    const { user, loading } = useAuth();

    // ── Chargement initial ──────────────────────────────────
    // Tant que GET /api/auth/me n'a pas répondu, on affiche
    // un spinner. Sans ça, on verrait un flash de la page login
    // avant d'être redirigé vers le dashboard.
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    // ── Pas connecté → login ────────────────────────────────
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // ── Rôle insuffisant → accès refusé ────────────────────
    // Si la route exige un rôle spécifique et que l'utilisateur
    // ne l'a pas, on le redirige vers le tableau de bord.
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    // ── Autorisé → on rend le contenu de la route ──────────
    // <Outlet /> affiche le composant enfant défini dans le routeur.
    return <Outlet />;
}