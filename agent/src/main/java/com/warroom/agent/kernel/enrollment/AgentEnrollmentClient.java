package com.warroom.agent.kernel.enrollment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.warroom.agent.kernel.model.AgentHealthSnapshot;
import com.warroom.agent.kernel.model.AgentIdentity;
import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.transmission.model.EnvelopedEvent;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Client réseau du noyau.
 *
 * Responsabilités :
 * - enrollment initial ;
 * - récupération configuration distante ;
 * - envoi heartbeat.
 *
 * Ici on garde un client HTTP simple basé sur java.net.http.HttpClient.
 */
public class AgentEnrollmentClient {

    // L'URL de base du serveur backend (ex: "http://localhost:8080")
    private final String baseUrl;

    // Outil Jackson pour transformer nos objets Java en JSON (et vice-versa)
    private final ObjectMapper objectMapper;

    // Le client HTTP natif de Java (introduit dans Java 11).
    // Très performant, il évite d'importer des librairies externes lourdes comme Apache HttpClient.
    private final HttpClient httpClient;

    // Le constructeur initialise le client avec l'URL cible et le convertisseur JSON.
    public AgentEnrollmentClient(String baseUrl, ObjectMapper objectMapper) {
        this.baseUrl = baseUrl;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    /**
     * Demande l'enrôlement de l'agent au backend.
     * Cette méthode est appelée au tout premier démarrage de l'agent pour obtenir un agentId et une apiKey.
     */
    public AgentIdentity enroll(String hostname, String osName, String osVersion, String agentVersion) {
        try {
            // 1. Préparation des données (Payload)
            // On utilise un Map pour construire rapidement la structure JSON (clé/valeur) attendue par le serveur.
            Map<String, Object> requestBody = Map.of(
                    "hostname", hostname,
                    "osName", osName,
                    "osVersion", osVersion,
                    "agentVersion", agentVersion
            );

            // Transformation du Map en chaîne de caractères JSON
            String body = objectMapper.writeValueAsString(requestBody);

            // 2. Construction de la requête HTTP
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/agents/enroll"))        // Endpoint d'enrôlement
                    .header("Content-Type", "application/json")  // On précise au serveur qu'on envoie du JSON
                    .POST(HttpRequest.BodyPublishers.ofString(body))        // Méthode POST avec notre JSON dans le corps
                    .build();

            // 3. Envoi de la requête de manière "synchrone" (le thread attend la réponse du serveur)
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            // 4. Traitement de la réponse
            // Si le code HTTP est entre 200 et 299, c'est un succès.
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                // On transforme le JSON reçu (la réponse du serveur) en un Map Java
                Map<?, ?> json = objectMapper.readValue(response.body(), Map.class);

                // Extraction des informations d'identité
                String agentId = String.valueOf(json.get("agentId"));
                String apiKey = String.valueOf(json.get("apiKey"));

                // On retourne le nouvel objet identité avec la date du jour
                return new AgentIdentity(agentId, apiKey, Instant.now());
            }

            // 5. Gestion des erreurs HTTP (ex: 400 Bad Request, 500 Internal Server Error)
            throw new IllegalStateException("[AgentEnrollmentClient] Enrollment failed - HTTP " + response.statusCode() + " - " + response.body());
        } catch (IOException | InterruptedException e) {
            // 6. Gestion des erreurs techniques (Réseau coupé, timeout, ou thread interrompu)

            // Règle d'or en Java : Si on attrape une InterruptedException (qui veut dire "On m'a demandé de m'arrêter"),
            // il faut TOUJOURS redonner ce statut d'interruption au Thread courant pour ne pas bloquer l'arrêt de l'application.
            Thread.currentThread().interrupt();
            throw new IllegalStateException("[AgentEnrollmentClient] Enrollment failed - Network or thread error", e);
        }
    }

    /**
     * Récupère la configuration distante de l'agent.
     * Appelé après l'enrôlement ou par la tâche de fond (ConfigRefreshScheduler) pour mettre à jour l'agent.
     */
    public AgentConfig fetchRemoteConfig(AgentIdentity identity) {
        try {
            // Construction d'une requête GET
            HttpRequest request = HttpRequest.newBuilder()
                    // L'URL contient l'ID de l'agent pour que le serveur sache de qui on parle
                    .uri(URI.create(baseUrl + "/api/agents/" + identity.agentId() + "/config"))
                    // L'en-tête "Authorization: Bearer <token>" prouve au serveur qu'on est bien cet agent
                    .header("Authorization", "Bearer " + identity.apiKey())
                    .GET() // Pas de corps (body) nécessaire pour un GET
                    .build();

            // Envoi de la requête
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            // Succès : on désérialise le JSON directement en objet AgentConfig
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return objectMapper.readValue(response.body(), AgentConfig.class);
            }

            // Erreur serveur ou authentification (ex: 401 Unauthorized)
            throw new IllegalStateException("[AgentEnrollmentClient] Configuration fetch failed - HTTP " + response.statusCode() + " - " + response.body());
        } catch (IOException | InterruptedException e) {
            // Erreur réseau
            Thread.currentThread().interrupt();
            throw new IllegalStateException("[AgentEnrollmentClient] Configuration fetch failed - Network or thread error", e);
        }
    }

    /**
     * Envoie un heartbeat technique au backend.
     * Permet au serveur de savoir que l'agent est vivant et de connaître ses métriques.
     */
    public void sendHeartbeat(AgentIdentity identity, AgentHealthSnapshot snapshot) {
        try {
            // Transformation de la "photographie" de santé en JSON
            String body = objectMapper.writeValueAsString(snapshot);

            // Construction de la requête POST
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/agents/" + identity.agentId() + "/heartbeat"))
                    .header("Authorization", "Bearer " + identity.apiKey()) // Authentification
                    .header("Content-Type", "application/json")             // Format
                    .POST(HttpRequest.BodyPublishers.ofString(body))                   // Contenu
                    .build();

            // Envoi de la requête
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            // Si ce n'est PAS un succès (le "!" inverse la condition), on lève une erreur
            if (!(response.statusCode() >= 200 && response.statusCode() < 300)) {
                throw new IllegalStateException("[AgentEnrollmentClient] Heartbeat sending failed - HTTP " + response.statusCode() + " - " + response.body());
            }
        } catch (IOException | InterruptedException e) {
            // Erreur réseau
            Thread.currentThread().interrupt();
            throw new IllegalStateException("[AgentEnrollmentClient] Heartbeat sending failed - Network or thread error", e);
        }
    }

    /**
     * Envoie un lot d'événements emballés au serveur.
     * Appelé par le Batcher quand la file d'attente est pleine ou que le timer est écoulé.
     */
    public void sendEvents(AgentIdentity identity, List<EnvelopedEvent> batch) {
        try {
            // Transformation de la liste d'événements en un grand tableau JSON [...]
            String body = objectMapper.writeValueAsString(batch);

            // Construction de la requête POST
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/agents/" + identity.agentId() + "/events"))
                    .header("Authorization", "Bearer " + identity.apiKey()) // Sécurité
                    .header("Content-Type", "application/json")             // Format
                    .POST(HttpRequest.BodyPublishers.ofString(body))                   // Liste des logs
                    .build();

            // Envoi de la requête
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            // Vérification de la réponse. Si le serveur refuse (ex: erreur 500, ou base de données pleine côté serveur)
            if (!(response.statusCode() >= 200 && response.statusCode() < 300)) {
                // Attention ici, par rapport aux autres, response.body() n'a pas été ajouté à ce message,
                // mais la logique reste exactement la même.
                throw new IllegalStateException("[AgentEnrollmentClient] Events sending failed - HTTP " + response.statusCode());
            }
        } catch (IOException | InterruptedException e) {
            // Si le réseau lâche pendant l'envoi des événements, l'erreur remonte au EventBatcher
            // (qui, à l'avenir, pourrait décider de remettre les événements dans la file d'attente).
            Thread.currentThread().interrupt();
            throw new IllegalStateException("[AgentEnrollmentClient] Events sending failed - Network or thread error", e);
        }
    }
}