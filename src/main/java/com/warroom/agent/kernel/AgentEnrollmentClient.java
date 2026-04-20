package com.warroom.agent.kernel;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
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

    private final String baseUrl;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public AgentEnrollmentClient(String baseUrl, ObjectMapper objectMapper) {
        this.baseUrl = baseUrl;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    /**
     * Demande l'enrôlement de l'agent au backend.
     */
    public AgentIdentity enroll(String hostname, String osName, String osVersion, String agentVersion) {
        try {
            Map<String, Object> requestBody = Map.of(
                    "hostname", hostname,
                    "osName", osName,
                    "osVersion", osVersion,
                    "agentVersion", agentVersion
            );

            String body = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/agents/enroll"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                Map<?, ?> json = objectMapper.readValue(response.body(), Map.class);

                String agentId = String.valueOf(json.get("agentId"));
                String apiKey = String.valueOf(json.get("apiKey"));

                return new AgentIdentity(agentId, apiKey, Instant.now());
            }

            throw new IllegalStateException("HTTP enrollment error: " + response.statusCode() + " - " + response.body());
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Impossible enrollment", e);
        }
    }

    /**
     * Récupère la configuration distante de l'agent.
     */
    public AgentConfig fetchRemoteConfig(AgentIdentity identity) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/agents/" + identity.agentId() + "/config"))
                    .header("Authorization", "Bearer " + identity.apiKey())
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return objectMapper.readValue(response.body(), AgentConfig.class);
            }

            throw new IllegalStateException("HTTP configuration error: " + response.statusCode() + " - " + response.body());
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to load configuration", e);
        }
    }

    /**
     * Envoie un heartbeat technique au backend.
     */
    public void sendHeartbeat(AgentIdentity identity, AgentHealthSnapshot snapshot) {
        try {
            String body = objectMapper.writeValueAsString(snapshot);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/agents/" + identity.agentId() + "/heartbeat"))
                    .header("Authorization", "Bearer " + identity.apiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (!(response.statusCode() >= 200 && response.statusCode() < 300)) {
                throw new IllegalStateException("HTTP Heartbeat error: " + response.statusCode() + " - " + response.body());
            }
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Impossible Heartbeat", e);
        }
    }
}