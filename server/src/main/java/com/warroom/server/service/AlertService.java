package com.warroom.server.service;

import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.SecurityEvent;
import com.warroom.server.model.AlertStatus;
import com.warroom.server.model.Severity;
import com.warroom.server.repository.AlertRecordRepository;
import com.warroom.server.repository.SecurityEventRepository;
import com.warroom.server.specification.AlertSpecifications;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AlertService {

    private final AlertRecordRepository alertRepository;
    private final SecurityEventRepository eventRepository;

    public AlertService(AlertRecordRepository alertRepository,
                        SecurityEventRepository eventRepository) {
        this.alertRepository = alertRepository;
        this.eventRepository = eventRepository;
    }

    // -----------------------------------------------------------------
    // LISTE PAGINÉE AVEC FILTRES COMBINÉS
    // -----------------------------------------------------------------

    public Page<AlertRecord> getAlerts(int page, int size,
                                       List<Severity> severities,
                                       List<AlertStatus> statuses,
                                       String agentId,
                                       Instant from, Instant to) {

        // Construction dynamique de la requête avec Specification
        Specification<AlertRecord> spec = Specification.where(null);

        Specification<AlertRecord> sevSpec = AlertSpecifications.hasSeverityIn(severities);
        if (sevSpec != null) spec = spec.and(sevSpec);

        Specification<AlertRecord> statSpec = AlertSpecifications.hasStatusIn(statuses);
        if (statSpec != null) spec = spec.and(statSpec);

        Specification<AlertRecord> agentSpec = AlertSpecifications.hasAgentId(agentId);
        if (agentSpec != null) spec = spec.and(agentSpec);

        Specification<AlertRecord> fromSpec = AlertSpecifications.createdAfter(from);
        if (fromSpec != null) spec = spec.and(fromSpec);

        Specification<AlertRecord> toSpec = AlertSpecifications.createdBefore(to);
        if (toSpec != null) spec = spec.and(toSpec);

        // Tri : sévérité DESC puis date DESC
        Sort sort = Sort.by(
                Sort.Order.desc("severity"),
                Sort.Order.desc("createdAt")
        );

        return alertRepository.findAll(spec, PageRequest.of(page, size, sort));
    }

    // -----------------------------------------------------------------
    // DÉTAIL D'UNE ALERTE
    // -----------------------------------------------------------------

    public Map<String, Object> getAlertDetail(Long alertId) {
        AlertRecord alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Alerte introuvable"));

        Map<String, Object> detail = new HashMap<>();
        detail.put("alert", alert);

        // SecurityEvent source (le log brut qui a déclenché l'alerte)
        if (alert.getEventId() != null) {
            eventRepository.findById(alert.getEventId())
                    .ifPresent(event -> detail.put("sourceEvent", event));
        }

        // Info agent
        detail.put("agent", alert.getAgent());

        // Contexte : 10 dernières alertes du même agent
        List<AlertRecord> recentAlerts = alertRepository
                .findTop10ByAgent_AgentIdOrderByCreatedAtDesc(alert.getAgent().getAgentId());
        detail.put("recentAlerts", recentAlerts);

        return detail;
    }

    // -----------------------------------------------------------------
    // ACQUITTER UNE ALERTE (L1 uniquement)
    // -----------------------------------------------------------------

    @Transactional
    public AlertRecord acknowledge(Long alertId, Long userId) {
        AlertRecord alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Alerte introuvable"));

        if (alert.getStatus() != AlertStatus.NEW) {
            throw new IllegalStateException("Cette alerte a déjà été traitée");
        }

        alert.setStatus(AlertStatus.ACKNOWLEDGED);
        alert.setQualifiedByUserId(userId);
        alert.setQualifiedAt(Instant.now());

        log.info("Alerte {} acquittée par userId={}", alertId, userId);
        return alertRepository.save(alert);
    }

    // -----------------------------------------------------------------
    // QUALIFIER EN FAUX POSITIF (L1 uniquement)
    // -----------------------------------------------------------------

    @Transactional
    public AlertRecord markFalsePositive(Long alertId, Long userId, String justification) {
        if (justification == null || justification.isBlank()) {
            throw new IllegalArgumentException("Une justification est obligatoire pour qualifier un faux positif");
        }

        AlertRecord alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Alerte introuvable"));

        if (alert.getStatus() == AlertStatus.ESCALATED) {
            throw new IllegalStateException("Cette alerte a déjà été escaladée en incident");
        }

        if (alert.getStatus() == AlertStatus.FALSE_POSITIVE) {
            throw new IllegalStateException("Cette alerte est déjà qualifiée en faux positif");
        }

        alert.setStatus(AlertStatus.FALSE_POSITIVE);
        alert.setQualifiedByUserId(userId);
        alert.setQualifiedAt(Instant.now());
        alert.setJustification(justification);

        log.info("Alerte {} qualifiée faux positif par userId={}", alertId, userId);
        return alertRepository.save(alert);
    }
}