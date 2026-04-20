package com.warroom.server.service;

import com.warroom.server.dto.AgentConfigDto;
import com.warroom.server.dto.AgentHealthSnapshotDto;
import com.warroom.server.dto.EnrollmentRequest;
import com.warroom.server.dto.EnrollmentResponse;
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
}