import { useEffect } from 'react';

export default function useSSE(onAlertReceived) {
    useEffect(() => {
        // Ouvre une connexion permanente avec le backend Spring Boot
        const eventSource = new EventSource('/api/dashboard/stream', {
            withCredentials: true // Très important pour faire passer le cookie JSESSIONID
        });

        // On écoute spécifiquement l'événement "security-alert" que tu as défini dans SseNotificationService.java
        eventSource.addEventListener('security-alert', (event) => {
            try {
                const newAlert = JSON.parse(event.data);
                onAlertReceived(newAlert);
            } catch (error) {
                console.error("Erreur de parsing de l'alerte SSE :", error);
            }
        });

        // Gestion des erreurs (coupure serveur, perte réseau, etc.)
        eventSource.onerror = (error) => {
            console.error("Déconnexion du flux SSE en temps réel.");
            eventSource.close();
        };

        // Nettoyage : quand l'analyste quitte la page des alertes, on coupe le flux pour économiser la mémoire
        return () => {
            eventSource.close();
        };
    }, [onAlertReceived]);
}