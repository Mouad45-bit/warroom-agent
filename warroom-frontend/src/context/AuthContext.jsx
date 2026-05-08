// /src/context/AuthContext.jsx

// ══════════════════════════════════════════════════════════════
//  CONTEXTE D'AUTHENTIFICATION
// ══════════════════════════════════════════════════════════════
//
//  Ce contexte stocke l'utilisateur connecté (userId, username,
//  fullName, role) et fournit les fonctions login/logout.
//
//  Au chargement de l'application, il appelle GET /api/auth/me
//  pour vérifier si une session active existe déjà (cas d'un
//  rafraîchissement de page — le cookie JSESSIONID est toujours
//  valide côté serveur). Cf. contrat d'API §1.3.
//
//  Les composants enfants accèdent à l'utilisateur via :
//    const { user, login, logout } = useAuth();
// ══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

// Création du contexte React (vide par défaut)
const AuthContext = createContext(null);

// ── PROVIDER ────────────────────────────────────────────────
// Enveloppe toute l'application dans <AuthProvider> (dans App.jsx).
// Il gère 3 états : l'utilisateur connecté, le chargement initial,
// et les erreurs éventuelles.

export function AuthProvider({ children }) {
    // L'objet user : { userId, username, fullName, role } ou null
    const [user, setUser] = useState(null);

    // true tant que GET /api/auth/me n'a pas répondu.
    // Empêche le flash de la page login avant que la vérification
    // de session ne soit terminée.
    const [loading, setLoading] = useState(true);

    // ── Vérification de session au chargement ───────────────
    // Appelé une seule fois au montage du Provider.
    // Si le cookie JSESSIONID est encore valide, le serveur
    // retourne les infos de l'utilisateur → on est connecté.
    // Sinon 401 → user reste null → redirection vers /login.
    useEffect(() => {
        api
            .get('/api/auth/me')
            .then((res) => setUser(res.data))
            .catch(() => setUser(null)) // 401 = pas de session
            .finally(() => setLoading(false));
    }, []);

    // ── LOGIN ───────────────────────────────────────────────
    // Appelé par LoginPage. Envoie les identifiants au serveur.
    // En cas de succès, le serveur crée une session et renvoie
    // un Set-Cookie: JSESSIONID + les infos utilisateur.
    //
    // Retourne : { success, error, status }
    //   - success: true si login OK
    //   - error: message d'erreur si échec
    //   - status: code HTTP (401 = invalide, 423 = verrouillé)
    const login = useCallback(async (username, password) => {
        try {
            const res = await api.post('/api/auth/login', { username, password });
            setUser(res.data); // Stocke { userId, username, fullName, role }
            return { success: true };
        } catch (err) {
            const status = err.response?.status;
            const message = err.response?.data?.message || 'Erreur de connexion.';
            return { success: false, error: message, status };
        }
    }, []);

    // ── LOGOUT ──────────────────────────────────────────────
    // Détruit la session côté serveur. Le cookie JSESSIONID
    // devient invalide. On remet user à null localement.
    const logout = useCallback(async () => {
        try {
            await api.post('/api/auth/logout');
        } catch {
            // Même si la requête échoue (réseau), on déconnecte localement
        }
        setUser(null);
    }, []);

    // ── Valeur exposée aux composants enfants ───────────────
    const value = {
        user,       // null si pas connecté, sinon { userId, username, fullName, role }
        loading,    // true pendant la vérification initiale de session
        login,      // (username, password) => { success, error, status }
        logout,     // () => void
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── HOOK D'ACCÈS ────────────────────────────────────────────
// Raccourci pour accéder au contexte dans n'importe quel composant.
// Usage : const { user, login, logout } = useAuth();
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth() doit être utilisé dans un <AuthProvider>');
    }
    return context;
}