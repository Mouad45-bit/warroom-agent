package com.warroom.server.service;

import com.warroom.server.dto.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AgentService {

    // Stockage en mémoire pour le MVP (à remplacer par une base de données plus tard)
    // Clé : agentId, Valeur : apiKey
    private final Map<String, String> registeredAgents = new ConcurrentHashMap<>();

    // Clé : agentId, Valeur : dernier état de santé connu
    private final Map<String, AgentHealthSnapshotDto> agentHealthStates = new ConcurrentHashMap<>();

    public EnrollmentResponse enrollAgent(EnrollmentRequest request) {
        String agentId = "agt-" + UUID.randomUUID().toString().substring(0, 8);
        String apiKey = UUID.randomUUID().toString();

        registeredAgents.put(agentId, apiKey);

        System.out.println("[Server] New agent enlisted : " + agentId + " (" + request.hostname() + ")");

        return new EnrollmentResponse(agentId, apiKey);
    }

    public boolean isAuthorized(String agentId, String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return false;
        }
        String providedToken = authHeader.substring(7);
        String expectedToken = registeredAgents.get(agentId);

        return expectedToken != null && expectedToken.equals(providedToken);
    }

    public AgentConfigDto getActiveConfig(String agentId) {
        return new AgentConfigDto(
                30, // heartbeat 30s
                100, // batch 100 événements
                10, // retry 10s
                List.of("LogCollector", "CommandCollector") // Collecteurs activés
        );
    }

    public void processHeartbeat(String agentId, AgentHealthSnapshotDto snapshot) {
        agentHealthStates.put(agentId, snapshot);
        System.out.println("[Server] Heartbeat received from : " + agentId + " | Active : " + snapshot.running());
    }

    public void processEvents(String agentId, List<EnvelopedEventDto> events) {
        if (events == null || events.isEmpty()) {
            return;
        }

        System.out.println("[Server] Received a batch of " + events.size() + " event(s) from the agent : " + agentId);

        // On affiche les 3 premiers événements pour vérifier que tout passe bien
        int limit = Math.min(events.size(), 3);
        for (int i = 0; i < limit; i++) {
            EnvelopedEventDto event = events.get(i);
            System.out.println("   -> [" + event.sourceType() + "] " + event.payload());
        }

        if (events.size() > 3) {
            System.out.println("   -> ... and " + (events.size() - 3) + " others.");
        }
    }
}