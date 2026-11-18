'use client';

// src/pages/LoginPage.jsx — Version Next.js
//
// Changements par rapport à React/Vite :
//   1. 'use client' en haut
//   2. useRouter (next/navigation) au lieu de useNavigate (react-router-dom)
//   3. router.replace('/') au lieu de <Navigate to="/" />
//   Le reste du code (formulaire, gestion d'erreur) est IDENTIQUE.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Shield, Loader2, AlertTriangle, Lock } from 'lucide-react';

export default function LoginPage() {
    const { user, login, loading } = useAuth();
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLocked, setIsLocked] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // ── Si déjà connecté, rediriger vers le dashboard ─────
    useEffect(() => {
        if (!loading && user) {
            router.replace('/');
        }
    }, [loading, user, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLocked(false);
        setSubmitting(true);

        const result = await login(username, password);

        if (result.success) {
            router.replace('/');
        } else {
            if (result.status === 423) {
                setIsLocked(true);
                setError(result.error);
            } else {
                setError(result.error);
            }
        }

        setSubmitting(false);
    };

    // Pendant le chargement ou si déjà connecté, ne rien afficher
    if (loading || user) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4">
                        <Shield className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Vigilix SOC</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Connectez-vous pour accéder à la plateforme
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-8">
                    {error && (
                        <div
                            className={`flex items-start gap-3 p-4 rounded-xl mb-6 ${
                                isLocked
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                        >
                            {isLocked ? (
                                <Lock className="w-5 h-5 shrink-0 mt-0.5" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            )}
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Identifiant
                            </label>
                            <input
                                id="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="ex : ahmed.l1"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition-colors"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Mot de passe
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {submitting ? 'Connexion...' : 'Se connecter'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
