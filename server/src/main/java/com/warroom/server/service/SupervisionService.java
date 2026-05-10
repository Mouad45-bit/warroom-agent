package com.warroom.server.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.warroom.server.dto.*;
import com.warroom.server.entity.Agent;
import com.warroom.server.entity.AgentHealthRecord;
import com.warroom.server.model.HealthStatus;
import com.warroom.server.repository.AgentHealthRecordRepository;
import com.warroom.server.repository.AgentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class SupervisionService {

    private final AgentRepository agentRepository;
    private final AgentHealthRecordRepository healthRepository;
    private final ObjectMapper objectMapper;

    public SupervisionService(AgentRepository agentRepository, AgentHealthRecordRepository healthRepository) {
        this.agentRepository = agentRepository;
        this.healthRepository = healthRepository;
        this.objectMapper = new ObjectMapper();
    }

    // --- 1. LISTE DES AGENTS (CONTRAT VALIDÉ) ---
    public List<AgentSummaryDto> getAllAgentsSummary() {
        return agentRepository.findAll().stream().map(agent -> {
            HealthStatus status = calculateHealthStatus(agent.getLastSeenAt());

            int activeCollectors = 0;
            int totalCollectors = agent.getEnabledCollectors() != null ? agent.getEnabledCollectors().size() : 0;

            AgentHealthRecord latestRecord = healthRepository.findFirstByAgent_AgentIdOrderByTimestampDesc(agent.getAgentId()).orElse(null);

            if (latestRecord != null && latestRecord.getSnapshotData() != null && !latestRecord.getSnapshotData().equals("[]")) {
                try {
                    List<ComponentHealthDto> comps = objectMapper.readValue(latestRecord.getSnapshotData(), new TypeReference<>() {});
                    activeCollectors = (int) comps.stream().filter(ComponentHealthDto::running).count();
                    totalCollectors = Math.max(totalCollectors, comps.size());
                } catch (Exception e) {
                    log.error("Erreur de parsing des collecteurs pour l'agent {}", agent.getAgentId());
                }
            }

            return new AgentSummaryDto(
                    agent.getAgentId(), agent.getHostname(), agent.getOsName(), agent.getOsVersion(),
                    agent.getLastSeenAt(), status, activeCollectors, totalCollectors
            );
        }).collect(Collectors.toList());
    }

    // --- 2. DÉTAIL D'UN AGENT (CONTRAT VALIDÉ) ---
    public AgentDetailResponse getAgentDetail(String agentId) {
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new IllegalArgumentException("Agent introuvable"));

        List<AgentHealthRecord> recentRecords = healthRepository.findTop20ByAgent_AgentIdOrderByTimestampDesc(agentId);
        AgentHealthRecord latestRecord = recentRecords.isEmpty() ? null : recentRecords.get(0);

        List<HeartbeatSummaryDto> heartbeatSummaries = recentRecords.stream()
                .map(r -> new HeartbeatSummaryDto(
                        r.getTimestamp(),
                        r.isRunning() ? HealthStatus.GREEN : HealthStatus.RED, // Un heartbeat reçu mais avec isRunning=false est RED
                        r.getQueuedEvents()
                )).collect(Collectors.toList());

        List<ComponentHealthDto> components = new ArrayList<>();
        if (latestRecord != null && latestRecord.getSnapshotData() != null && !latestRecord.getSnapshotData().equals("[]")) {
            try {
                components = objectMapper.readValue(latestRecord.getSnapshotData(), new TypeReference<>() {});
            } catch (Exception e) {
                log.error("Erreur de parsing des composants", e);
            }
        }

        // Simulé car non persistant dans la BDD actuelle, prêt pour une future évolution
        List<String> quarantined = new ArrayList<>();

        return new AgentDetailResponse(agent, latestRecord, heartbeatSummaries, components, quarantined);
    }

    // --- RÈGLE MÉTIER STRICTE DU CONTRAT ---
    private HealthStatus calculateHealthStatus(Instant lastSeenAt) {
        if (lastSeenAt == null) return HealthStatus.RED;

        long secondsSinceLastSeen = Duration.between(lastSeenAt, Instant.now()).getSeconds();

        if (secondsSinceLastSeen < 90) return HealthStatus.GREEN;
        if (secondsSinceLastSeen <= 300) return HealthStatus.ORANGE;

        return HealthStatus.RED;
    }
}