// /src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';

// ══════════════════════════════════════════════════════════════
//  COMPOSANT TEMPORAIRE DE TEST
//  Sert uniquement à vérifier que la session est bien établie.
// ══════════════════════════════════════════════════════════════
function TempDashboard() {
    const { user, logout, loading } = useAuth();

    // 1. Pendant la vérification du cookie initial
    if (loading) {
        return <div className="p-8 text-gray-500">Vérification de la session...</div>;
    }

    // 2. Si non connecté, on le renvoie au login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 3. Si connecté, on affiche ses infos et un bouton de déconnexion
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h1 className="text-2xl font-bold text-green-600 mb-6 flex items-center gap-2">
                    🎉 Connexion réussie !
                </h1>

                <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-2">Données de session renvoyées par Spring Boot :</p>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
                </div>

                <button
                    onClick={logout}
                    className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition-colors"
                >
                    Se déconnecter
                </button>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
//  APPLICATION PRINCIPALE (Version de Test)
// ══════════════════════════════════════════════════════════════
export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Route publique */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Route protégée temporaire */}
                    <Route path="/" element={<TempDashboard />} />

                    {/* Fallback pour les URL inconnues */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}