package com.warroom.server.service;

import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.Agent;
import com.warroom.server.entity.Incident;
import com.warroom.server.entity.User;
import com.warroom.server.model.*;
import com.warroom.server.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DashboardService {

    private final AlertRecordRepository alertRepository;
    private final IncidentRepository incidentRepository;
    private final AgentRepository agentRepository;
    private final UserRepository userRepository;

    public DashboardService(AlertRecordRepository alertRepository,
                            IncidentRepository incidentRepository,
                            AgentRepository agentRepository,
                            UserRepository userRepository) {
        this.alertRepository = alertRepository;
        this.incidentRepository = incidentRepository;
        this.agentRepository = agentRepository;
        this.userRepository = userRepository;
    }

    // =================================================================
    // GET /api/dashboard/stats — Stats communes (tous les rôles)
    // =================================================================

    public Map<String, Object> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();

        // --- Alertes par statut ---
        Map<String, Long> alertsByStatus = new LinkedHashMap<>();
        for (AlertStatus s : AlertStatus.values()) {
            alertsByStatus.put(s.name(), alertRepository.countByStatus(s));
        }
        stats.put("alertsByStatus", alertsByStatus);

        // --- Alertes NEW par sévérité (stock de travail L1) ---
        Map<String, Long> alertsBySeverity = new LinkedHashMap<>();
        List<AlertRecord> newAlerts = alertRepository.findAll().stream()
                .filter(a -> a.getStatus() == AlertStatus.NEW)
                .collect(Collectors.toList());
        for (Severity sev : Severity.values()) {
            long count = newAlerts.stream().filter(a -> a.getSeverity() == sev).count();
            alertsBySeverity.put(sev.name(), count);
        }
        stats.put("alertsBySeverity", alertsBySeverity);

        // --- Incidents par statut ---
        Map<String, Long> incidentsByStatus = new LinkedHashMap<>();
        for (IncidentStatus s : IncidentStatus.values()) {
            incidentsByStatus.put(s.name(), incidentRepository.countByStatus(s));
        }
        stats.put("incidentsByStatus", incidentsByStatus);

        // --- Agents connectés / warning / déconnectés ---
        Instant now = Instant.now();
        List<Agent> agents = agentRepository.findAll();
        long connected = 0, warning = 0, disconnected = 0;
        for (Agent agent : agents) {
            if (agent.getLastSeenAt() == null) {
                disconnected++;
            } else {
                long secondsAgo = Duration.between(agent.getLastSeenAt(), now).getSeconds();
                if (secondsAgo < 90) {
                    connected++;
                } else if (secondsAgo < 300) {
                    warning++;
                } else {
                    disconnected++;
                }
            }
        }
        stats.put("agentsConnected", connected);
        stats.put("agentsWarning", warning);
        stats.put("agentsDisconnected", disconnected);

        // --- MTTD 24h (Mean Time To Detect) ---
        // Moyenne de (qualifiedAt - createdAt) sur les alertes acquittées dans les 24h
        Instant h24ago = now.minus(Duration.ofHours(24));
        List<AlertRecord> recentAcknowledged = alertRepository.findAll().stream()
                .filter(a -> a.getQualifiedAt() != null && a.getQualifiedAt().isAfter(h24ago))
                .filter(a -> a.getStatus() == AlertStatus.ACKNOWLEDGED
                        || a.getStatus() == AlertStatus.ESCALATED
                        || a.getStatus() == AlertStatus.FALSE_POSITIVE)
                .collect(Collectors.toList());

        if (recentAcknowledged.isEmpty()) {
            stats.put("mttd24h", null);
        } else {
            double avgSeconds = recentAcknowledged.stream()
                    .mapToLong(a -> Duration.between(a.getCreatedAt(), a.getQualifiedAt()).getSeconds())
                    .average()
                    .orElse(0);
            stats.put("mttd24h", Math.round(avgSeconds));
        }

        // --- MTTR 24h (Mean Time To Resolve) ---
        // Moyenne de (updatedAt quand CLOSED - createdAt) sur les incidents clôturés dans les 24h
        List<Incident> recentClosed = incidentRepository.findAll().stream()
                .filter(i -> i.getStatus() == IncidentStatus.CLOSED)
                .filter(i -> i.getUpdatedAt().isAfter(h24ago))
                .collect(Collectors.toList());

        if (recentClosed.isEmpty()) {
            stats.put("mttr24h", null);
        } else {
            double avgSeconds = recentClosed.stream()
                    .mapToLong(i -> Duration.between(i.getCreatedAt(), i.getUpdatedAt()).getSeconds())
                    .average()
                    .orElse(0);
            stats.put("mttr24h", Math.round(avgSeconds));
        }

        return stats;
    }

    // =================================================================
    // GET /api/dashboard/stats/manager — Stats Manager uniquement
    // =================================================================

    public Map<String, Object> getManagerStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        Instant h24ago = Instant.now().minus(Duration.ofHours(24));

        // --- Incidents par assigné (L2) ---
        List<User> l2Users = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.L2 && u.isActive())
                .collect(Collectors.toList());

        List<Incident> allIncidents = incidentRepository.findAll();

        List<Map<String, Object>> incidentsByAssignee = new ArrayList<>();
        for (User l2 : l2Users) {
            List<Incident> assigned = allIncidents.stream()
                    .filter(i -> l2.getId().equals(i.getAssignedToUserId()))
                    .collect(Collectors.toList());

            long openCount = assigned.stream()
                    .filter(i -> i.getStatus() != IncidentStatus.CLOSED && i.getStatus() != IncidentStatus.CLOSED_FALSE_POSITIVE)
                    .count();

            List<Incident> closed = assigned.stream()
                    .filter(i -> i.getStatus() == IncidentStatus.CLOSED)
                    .collect(Collectors.toList());

            Long avgResolution = null;
            if (!closed.isEmpty()) {
                double avg = closed.stream()
                        .mapToLong(i -> Duration.between(i.getCreatedAt(), i.getUpdatedAt()).getSeconds())
                        .average()
                        .orElse(0);
                avgResolution = Math.round(avg);
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("userId", l2.getId());
            entry.put("fullName", l2.getFullName());
            entry.put("openCount", openCount);
            entry.put("totalAssigned", (long) assigned.size());
            entry.put("avgResolutionTimeSeconds", avgResolution);
            incidentsByAssignee.add(entry);
        }
        stats.put("incidentsByAssignee", incidentsByAssignee);

        // --- Taux de triage par L1 ---
        List<User> l1Users = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.L1 && u.isActive())
                .collect(Collectors.toList());

        List<AlertRecord> allAlerts = alertRepository.findAll();

        List<Map<String, Object>> triageRateByL1 = new ArrayList<>();
        for (User l1 : l1Users) {
            List<AlertRecord> triaged = allAlerts.stream()
                    .filter(a -> l1.getId().equals(a.getQualifiedByUserId()))
                    .filter(a -> a.getQualifiedAt() != null && a.getQualifiedAt().isAfter(h24ago))
                    .collect(Collectors.toList());

            long alertsTriaged24h = triaged.size();

            Long avgTriageTime = null;
            if (!triaged.isEmpty()) {
                double avg = triaged.stream()
                        .mapToLong(a -> Duration.between(a.getCreatedAt(), a.getQualifiedAt()).getSeconds())
                        .average()
                        .orElse(0);
                avgTriageTime = Math.round(avg);
            }

            // Taux faux positifs = FP / total qualifiées
            long totalQualified = allAlerts.stream()
                    .filter(a -> l1.getId().equals(a.getQualifiedByUserId()))
                    .count();
            long fpCount = allAlerts.stream()
                    .filter(a -> l1.getId().equals(a.getQualifiedByUserId()))
                    .filter(a -> a.getStatus() == AlertStatus.FALSE_POSITIVE)
                    .count();
            Double falsePositiveRate = totalQualified > 0 ? Math.round((double) fpCount / totalQualified * 100.0) / 100.0 : null;

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("userId", l1.getId());
            entry.put("fullName", l1.getFullName());
            entry.put("alertsTriaged24h", alertsTriaged24h);
            entry.put("avgTriageTimeSeconds", avgTriageTime);
            entry.put("falsePositiveRate", falsePositiveRate);
            triageRateByL1.add(entry);
        }
        stats.put("triageRateByL1", triageRateByL1);

        return stats;
    }
}