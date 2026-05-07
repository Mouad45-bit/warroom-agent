package com.warroom.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.warroom.server.dto.*;
import com.warroom.server.entity.Agent;
import com.warroom.server.entity.AgentHealthRecord;
import com.warroom.server.entity.SecurityEvent;
import com.warroom.server.repository.AgentHealthRecordRepository;
import com.warroom.server.repository.AgentRepository;
import com.warroom.server.repository.SecurityEventRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class AgentService {

    private final AgentRepository agentRepository;
    private final SecurityEventRepository eventRepository;
    private final AgentHealthRecordRepository healthRepository;
    private final EventAnalysisService eventAnalysisService;
    private final ObjectMapper objectMapper;

    public AgentService(AgentRepository agentRepository,
                        SecurityEventRepository eventRepository,
                        AgentHealthRecordRepository healthRepository,
                        EventAnalysisService eventAnalysisService) {
        this.agentRepository = agentRepository;
        this.eventRepository = eventRepository;
        this.healthRepository = healthRepository;
        this.eventAnalysisService = eventAnalysisService;
        this.objectMapper = new ObjectMapper();
    }

    // -------------------------------------------------------------------------
    // ENROLLMENT
    // -------------------------------------------------------------------------

    public EnrollmentResponse enrollAgent(EnrollmentRequest request) {
        String agentId = "agt-" + UUID.randomUUID().toString().substring(0, 8);
        String apiKey  = UUID.randomUUID().toString();

        Agent agent = new Agent();
        agent.setAgentId(agentId);
        agent.setApiKey(apiKey);
        agent.setHostname(request.hostname());
        agent.setOsName(request.osName());
        agent.setOsVersion(request.osVersion());
        agent.setAgentVersion(request.agentVersion());
        agent.setEnrolledAt(Instant.now());
        agent.setLastSeenAt(Instant.now());

        agentRepository.save(agent);

        System.out.println("[Server] New agent enlisted : " + agentId
                + " (" + request.hostname() + ")");

        return new EnrollmentResponse(agentId, apiKey);
    }

    // -------------------------------------------------------------------------
    // AUTH
    // -------------------------------------------------------------------------

    public boolean isAuthorized(String agentId, String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return false;

        String providedToken = authHeader.substring(7);

        return agentRepository.findById(agentId)
                .map(a -> a.getApiKey().equals(providedToken))
                .orElse(false);
    }

    // -------------------------------------------------------------------------
    // CONFIG
    // -------------------------------------------------------------------------

    public AgentConfigDto getActiveConfig(String agentId) {
        // Config statique pour l'instant — étape 8 : la rendre dynamique par agent
        return new AgentConfigDto(
                30,
                100,
                10,
                List.of("LogCollector", "NetworkCollector", "ProcessCollector", "FileIntegrityCollector")
        );
    }

    // -------------------------------------------------------------------------
    // HEARTBEAT
    // -------------------------------------------------------------------------
    @Transactional
    public void processHeartbeat(String agentId, AgentHealthSnapshotDto snapshot) {
        agentRepository.findById(agentId).ifPresent(agent -> {
            // 1. Mise à jour lastSeenAt
            agent.setLastSeenAt(Instant.now());
            agentRepository.save(agent);

            // 2. Persistance du snapshot
            AgentHealthRecord record = new AgentHealthRecord();
            record.setAgent(agent);
            record.setTimestamp(Instant.now());
            record.setRunning(snapshot.running());

            // On mappe les nouvelles colonnes numériques
            record.setQueuedEvents(snapshot.queuedEvents());
            record.setDeliveredEvents(snapshot.deliveredEvents());
            record.setFailedBatches(snapshot.failedBatches());
            record.setDroppedEvents(snapshot.droppedEvents());
            record.setEnrollmentRetries(snapshot.enrollmentRetries());
            record.setConfigRefreshFailures(snapshot.configRefreshFailures());
            record.setComponentRestarts(snapshot.componentRestarts());

            if (snapshot.componentHealth() != null) {
                try {
                    //transforme la liste Java en texte JSON propre
                    String jsonArray = objectMapper.writeValueAsString(snapshot.componentHealth());
                    record.setSnapshotData(jsonArray);
                } catch (Exception e) {
                    System.err.println("[Server] Erreur de sérialisation JSON : " + e.getMessage());
                    record.setSnapshotData("[]");
                }
            } else {
                record.setSnapshotData("[]");
            }

            healthRepository.save(record);
        });

        System.out.println("[Server] Heartbeat from " + agentId
                + " | running=" + snapshot.running()
                + " | queued=" + snapshot.queuedEvents());
    }

    // -------------------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------------------
    @Transactional
    public void processEvents(String agentId, List<EnvelopedEventDto> events) {
        if (events == null || events.isEmpty()) return;

        // Récupérer l'Agent une seule fois (nécessaire pour la relation @ManyToOne)
        Agent agent = agentRepository.findById(agentId).orElse(null);
        if (agent == null) {
            System.err.println("[Server] Agent inconnu : " + agentId + " — batch ignoré");
            return;
        }

        for (EnvelopedEventDto dto : events) {
            // 1. Mapper le DTO → entité
            SecurityEvent event = new SecurityEvent();
            event.setAgent(agent);
            event.setSourceType(dto.sourceType());
            event.setCollectedAt(dto.collectedAt());
            event.setReceivedAt(Instant.now());
            event.setPayload(dto.payload());

            // 2. Persister l'événement brut
            SecurityEvent saved = eventRepository.save(event);

            // 3. Analyser → génère et persiste les alertes si nécessaire
            eventAnalysisService.analyze(saved);
        }

        System.out.println("[Server] Persisted " + events.size()
                + " event(s) from " + agentId);
    }
}