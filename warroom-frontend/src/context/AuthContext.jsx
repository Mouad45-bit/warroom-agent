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
//    const { user, login, logout, loading } = useAuth();
// ══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client'; // Ton vrai client Axios
import { mockCheckSession, mockLogin, mockLogout } from '../api/mockAuth'; // Le faux backend

// Création du contexte React (vide par défaut)
const AuthContext = createContext(null);

// ══════════════════════════════════════════════════════════════
// CONFIGURATION DE L'ENVIRONNEMENT
// true = Utilise les fausses données (pour coder l'UI)
// false = Utilise le vrai backend Spring Boot (Production/Tests)
// ══════════════════════════════════════════════════════════════
const USE_MOCK_AUTH = true;

// ── PROVIDER ────────────────────────────────────────────────
// Enveloppe toute l'application dans <AuthProvider> (dans App.jsx).
// Il gère 3 états : l'utilisateur connecté, le chargement initial,
// et les erreurs éventuelles.
export function AuthProvider({ children }) {
    // L'objet user : { userId, username, fullName, role } ou null
    const [user, setUser] = useState(null);

    // true tant que la vérification de session n'a pas répondu.
    // Empêche le flash de la page login avant que la vérification
    // de session ne soit terminée.
    const [loading, setLoading] = useState(true);

    // ── Vérification de session au chargement ───────────────
    // Appelé une seule fois au montage du Provider.
    // Si le cookie JSESSIONID est encore valide, le serveur
    // retourne les infos de l'utilisateur → on est connecté.
    // Sinon 401 → user reste null → redirection vers /login.
    const checkSession = async () => {
        try {
            if (USE_MOCK_AUTH) {
                const mockUser = await mockCheckSession();
                setUser(mockUser);
            } else {
                // VRAI APPEL API (Contrat Module 0)
                const res = await api.get('/api/auth/me');
                setUser(res.data);
            }
        } catch (error) {
            setUser(null); // Pas de session active
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
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
    const login = async (username, password) => {
        if (USE_MOCK_AUTH) {
            const result = await mockLogin(username, password);
            if (result.success) await checkSession();
            return result;
        } else {
            try {
                // VRAI APPEL API
                await api.post('/api/auth/login', { username, password });
                await checkSession(); // On récupère les infos de l'utilisateur après le login
                return { success: true };
            } catch (err) {
                return {
                    success: false,
                    status: err.response?.status,
                    error: err.response?.data?.message || 'Erreur lors de la connexion'
                };
            }
        }
    };

    // ── LOGOUT ──────────────────────────────────────────────
    // Détruit la session côté serveur. Le cookie JSESSIONID
    // devient invalide. On remet user à null localement.
    const logout = async () => {
        if (USE_MOCK_AUTH) {
            await mockLogout();
        } else {
            try {
                // VRAI APPEL API
                await api.post('/api/auth/logout');
            } catch (err) {
                console.error("Erreur logout", err);
            }
        }
        setUser(null);
        window.location.href = '/login';
    };

    // ── Valeur exposée aux composants enfants ───────────────
    return (
        <AuthContext.Provider value={{ user, login, logout, loading, checkSession }}>
            {children}
        </AuthContext.Provider>
    );
}

// ── HOOK D'ACCÈS ────────────────────────────────────────────
// Raccourci pour accéder au contexte dans n'importe quel composant.
// Usage : const { user, login, logout, loading } = useAuth();
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth() doit être utilisé dans un <AuthProvider>');
    }
    return context;
};