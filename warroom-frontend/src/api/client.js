// /src/api/client.js

// ══════════════════════════════════════════════════════════════
//  CLIENT HTTP — Configuration Axios globale
// ══════════════════════════════════════════════════════════════
//
//  POURQUOI withCredentials: true ?
//  L'authentification repose sur des sessions serveur avec un
//  cookie JSESSIONID. Ce flag demande à Axios d'envoyer le cookie
//  automatiquement à chaque requête et d'accepter les Set-Cookie
//  du serveur. Sans lui, le navigateur n'enverrait pas le cookie
//  et toutes les requêtes authentifiées recevraient un 401.
//
//  POURQUOI pas de baseURL ?
//  En développement, Vite proxy /api → localhost:8080 (cf. vite.config.js).
//  En production, le frontend sera servi par Spring Boot lui-même,
//  donc les chemins relatifs fonctionneront directement.
// ══════════════════════════════════════════════════════════════

import axios from 'axios';

const api = axios.create({
    // Envoie le cookie JSESSIONID à chaque requête (contrat d'API §0.2)
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Intercepteur de réponse ─────────────────────────────────
// Redirige vers /login si le backend renvoie 401 (session expirée).
// Cela implémente l'expiration automatique à 30min d'inactivité
// décrite dans le catalogue d'actions (§1.3 "Session Timeout").
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // On ne redirige que si on n'est PAS déjà sur la page de login.
            // Sans cette vérification, une erreur 401 sur /api/auth/login
            // déclencherait une boucle infinie de redirections.
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;