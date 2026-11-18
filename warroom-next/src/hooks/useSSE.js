'use client';

// src/hooks/useSSE.js
//
// Identique à la version React/Vite.
// Ajout d'une vérification `typeof window !== 'undefined'`
// car Next.js peut exécuter du code côté serveur (SSR).

import { useEffect } from 'react';

export default function useSSE(onAlertReceived) {
    useEffect(() => {
        // SSR guard — EventSource n'existe que dans le navigateur
        if (typeof window === 'undefined') return;

        const eventSource = new EventSource('/api/dashboard/stream', {
            withCredentials: true,
        });

        eventSource.addEventListener('security-alert', (event) => {
            try {
                const newAlert = JSON.parse(event.data);
                onAlertReceived(newAlert);
            } catch (error) {
                console.error("Erreur de parsing de l'alerte SSE :", error);
            }
        });

        eventSource.onerror = () => {
            console.error('Déconnexion du flux SSE en temps réel.');
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [onAlertReceived]);
}
