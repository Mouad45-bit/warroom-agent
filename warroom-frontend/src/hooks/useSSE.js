// /src/hooks/useSSE.js

// ══════════════════════════════════════════════════════════════
//  HOOK SSE — Flux d'alertes en temps réel
// ══════════════════════════════════════════════════════════════
//
//  Ce hook se connecte au endpoint SSE du serveur :
//    GET /api/dashboard/stream (contrat §2.6)
//
//  À chaque événement "security-alert", le callback onAlert
//  est appelé avec l'objet alerte parsé depuis le JSON.
//
//  POURQUOI EventSourcePolyfill ?
//  L'API native EventSource ne supporte pas withCredentials.
//  Or notre auth est basée sur un cookie de session.
//  La bibliothèque event-source-polyfill ajoute cette capacité.
//  Cf. contrat d'API §2.6 "Point d'attention".
//
//  Usage :
//    useSSE((newAlert) => {
//      setAlerts(prev => [newAlert, ...prev]);
//    });
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';

export default function useSSE(onAlert) {
    // useRef pour garder une référence stable au callback
    // sans déclencher de reconnexion à chaque re-render.
    const callbackRef = useRef(onAlert);
    callbackRef.current = onAlert;

    useEffect(() => {
        let eventSource;

        const connect = async () => {
            try {
                // Import dynamique du polyfill (tree-shakable)
                const { EventSourcePolyfill } = await import('event-source-polyfill');

                // Connexion au flux SSE avec envoi du cookie de session
                eventSource = new EventSourcePolyfill('/api/dashboard/stream', {
                    withCredentials: true,
                });

                // ── Écoute des événements "security-alert" ────────
                // Le serveur envoie : event: security-alert\ndata: {...JSON...}
                eventSource.addEventListener('security-alert', (event) => {
                    try {
                        const alert = JSON.parse(event.data);
                        callbackRef.current(alert);
                    } catch (err) {
                        console.error('[SSE] Erreur de parsing JSON :', err);
                    }
                });

                // ── Gestion des erreurs ───────────────────────────
                // Si la connexion est perdue (ex: serveur redémarré),
                // EventSourcePolyfill tente automatiquement de se reconnecter.
                eventSource.onerror = () => {
                    console.warn('[SSE] Connexion perdue, reconnexion automatique...');
                };
            } catch (err) {
                console.error('[SSE] Impossible de se connecter :', err);
            }
        };

        connect();

        // ── Nettoyage au démontage du composant ─────────────
        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, []); // [] = ne se reconnecte pas à chaque re-render
}