// ══════════════════════════════════════════════════════════════
//  APPLICATION PRINCIPALE — Routeur & Structure
// ══════════════════════════════════════════════════════════════
//
//  Arbre de composants :
//    <AuthProvider>           ← Contexte d'authentification
//      <BrowserRouter>        ← Routeur React
//        /login               ← Page publique
//        <Layout>             ← Sidebar + zone de contenu (protégé)
//          /                  ← Tableau de bord (tous les rôles)
//          /alerts            ← File d'alertes (L1, L2, MANAGER)
//          /incidents         ← Incidents (L1, L2, MANAGER) — placeholder
//          /agents            ← Supervision (MANAGER, ADMIN) — placeholder
//          /admin/users       ← Gestion comptes (MANAGER, ADMIN)
//        </Layout>
//
//  Les routes protégées utilisent <ProtectedRoute> qui vérifie
//  la session ET le rôle avant de rendre le composant enfant.
//
//  La navigation visible dans la Sidebar est contrôlée séparément
//  dans Layout.jsx — même si un L1 tape /admin/users dans l'URL,
//  ProtectedRoute le redirigera vers le dashboard.
// ══════════════════════════════════════════════════════════════

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
/*
import DashboardPage from './pages/DashboardPage';
import AlertsPage from './pages/AlertsPage';
import IncidentsPage from './pages/IncidentsPage';
import AgentsPage from './pages/AgentsPage';
 */
import UsersPage from './pages/UsersPage';

export default function App() {
    return (
        // AuthProvider enveloppe tout : le contexte est accessible partout.
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* ── Route publique : page de login ──────────── */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* ── Routes protégées : nécessitent une session ── */}
                    {/* Le Layout (Sidebar + contenu) s'affiche pour toutes
              les routes enfants via <Outlet />. */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<Layout />}>

                            {/* Tableau de bord — tous les rôles */}
                            {/*
                            <Route path="/" element={<DashboardPage />} />
                            */}

                            {/* File d'alertes — L1, L2, MANAGER (contrat §6) */}
                            {/*
                            <Route element={<ProtectedRoute allowedRoles={['L1', 'L2', 'MANAGER']} />}>
                                <Route path="/alerts" element={<AlertsPage />} />
                            </Route>
                            */}

                            {/* Incidents — L1, L2, MANAGER (placeholder Module 2) */}
                            {/*
                            <Route element={<ProtectedRoute allowedRoles={['L1', 'L2', 'MANAGER']} />}>
                                <Route path="/incidents" element={<IncidentsPage />} />
                            </Route>
                            */}

                            {/* Supervision agents — MANAGER, ADMIN (placeholder Module 5) */}
                            {/*
                            <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']} />}>
                                <Route path="/agents" element={<AgentsPage />} />
                            </Route>
                            */}

                            {/* Administration des comptes — MANAGER, ADMIN */}
                            <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']} />}>
                                <Route path="/admin/users" element={<UsersPage />} />
                            </Route>

                        </Route>
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}