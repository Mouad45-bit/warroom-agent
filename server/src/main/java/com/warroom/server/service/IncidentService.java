package com.warroom.server.service;

import com.warroom.server.dto.CreateIncidentRequest;
import com.warroom.server.entity.*;
import com.warroom.server.model.*;
import com.warroom.server.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final IncidentAlertRepository incidentAlertRepository;
    private final IncidentTimelineRepository timelineRepository;
    private final AlertRecordRepository alertRepository;
    private final UserRepository userRepository;

    public IncidentService(IncidentRepository incidentRepository,
                           IncidentAlertRepository incidentAlertRepository,
                           IncidentTimelineRepository timelineRepository,
                           AlertRecordRepository alertRepository,
                           UserRepository userRepository) {
        this.incidentRepository = incidentRepository;
        this.incidentAlertRepository = incidentAlertRepository;
        this.timelineRepository = timelineRepository;
        this.alertRepository = alertRepository;
        this.userRepository = userRepository;
    }

    // =================================================================
    // CRÉER UN INCIDENT (L1 — escalade d'alertes)
    // =================================================================

    @Transactional
    public Map<String, Object> createIncident(CreateIncidentRequest request, Long creatorUserId) {
        // Validations
        if (request.triageNote() == null || request.triageNote().isBlank()) {
            throw new IllegalArgumentException("La note de triage est obligatoire");
        }
        if (request.alertIds() == null || request.alertIds().isEmpty()) {
            throw new IllegalArgumentException("Au moins une alerte doit être associée");
        }

        // Vérifier que les alertes ne sont pas déjà escaladées
        for (Long alertId : request.alertIds()) {
            AlertRecord alert = alertRepository.findById(alertId)
                    .orElseThrow(() -> new IllegalArgumentException("Alerte " + alertId + " introuvable"));
            if (alert.getStatus() == AlertStatus.ESCALATED) {
                throw new IllegalStateException("L'alerte " + alertId + " est déjà escaladée");
            }
        }

        // Générer le numéro séquentiel
        long count = incidentRepository.count();
        String incidentNumber = String.format("INC-%04d", count + 1);

        // Parser la sévérité
        Severity severity;
        try {
            severity = Severity.valueOf(request.severity().toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Sévérité invalide : " + request.severity());
        }

        // Créer l'incident
        Incident incident = new Incident();
        incident.setIncidentNumber(incidentNumber);
        incident.setTitle(request.title());
        incident.setSeverity(severity);
        incident.setStatus(IncidentStatus.OPEN);
        incident.setAssignedToUserId(request.assignedToUserId());
        incident.setCreatedByUserId(creatorUserId);
        incident.setTriageNote(request.triageNote());

        Incident saved = incidentRepository.save(incident);

        // Lier les alertes et les marquer ESCALATED
        for (Long alertId : request.alertIds()) {
            incidentAlertRepository.save(new IncidentAlert(saved.getId(), alertId));

            AlertRecord alert = alertRepository.findById(alertId).orElseThrow();
            alert.setStatus(AlertStatus.ESCALATED);
            alert.setIncidentId(saved.getId());
            alert.setQualifiedByUserId(creatorUserId);
            alert.setQualifiedAt(Instant.now());
            alertRepository.save(alert);
        }

        // Première entrée de timeline
        User creator = userRepository.findById(creatorUserId).orElseThrow();
        addTimelineEntry(saved.getId(), TimelineEntryType.STATUS_CHANGE, creator,
                "Incident créé — " + request.triageNote(),
                null, IncidentStatus.OPEN);

        log.info("Incident {} créé par {} avec {} alerte(s)", incidentNumber, creator.getUsername(), request.alertIds().size());

        return buildIncidentResponse(saved);
    }

    // =================================================================
    // LISTER LES INCIDENTS (paginé)
    // =================================================================

    public Page<Incident> getIncidents(int page, int size,
                                       List<IncidentStatus> statuses,
                                       List<Severity> severities,
                                       Long assignedTo,
                                       Long currentUserId, Role currentRole) {

        Sort sort = Sort.by(Sort.Order.desc("severity"), Sort.Order.desc("createdAt"));
        PageRequest pageRequest = PageRequest.of(page, size, sort);

        // L2 sans filtre → ses incidents par défaut
        if (currentRole == Role.L2 && assignedTo == null) {
            return incidentRepository.findByAssignedToUserId(currentUserId, pageRequest);
        }

        // L1 → ses créations
        if (currentRole == Role.L1) {
            return incidentRepository.findByCreatedByUserId(currentUserId, pageRequest);
        }

        // Filtre par assigné
        if (assignedTo != null) {
            return incidentRepository.findByAssignedToUserId(assignedTo, pageRequest);
        }

        // Filtre par statut
        if (statuses != null && !statuses.isEmpty()) {
            return incidentRepository.findByStatusIn(statuses, pageRequest);
        }

        // Tout (Manager ou L2 qui veut voir tout)
        return incidentRepository.findAll(pageRequest);
    }

    // =================================================================
    // DÉTAIL D'UN INCIDENT
    // =================================================================

    public Map<String, Object> getIncidentDetail(Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Incident introuvable"));

        Map<String, Object> detail = new HashMap<>();
        detail.put("incident", buildIncidentResponse(incident));

        // Alertes liées
        List<IncidentAlert> links = incidentAlertRepository.findByIncidentId(incidentId);
        List<Long> alertIds = links.stream().map(IncidentAlert::getAlertId).collect(Collectors.toList());
        List<AlertRecord> alerts = alertRepository.findAllById(alertIds);
        detail.put("alerts", alerts);

        // Timeline complète
        List<IncidentTimelineEntry> timeline = timelineRepository.findByIncidentIdOrderByCreatedAtAsc(incidentId);
        detail.put("timeline", timeline);

        return detail;
    }

    // =================================================================
    // PRENDRE EN CHARGE (L2 — pool → assigné)
    // =================================================================

    @Transactional
    public void takeIncident(Long incidentId, Long l2UserId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Incident introuvable"));

        if (incident.getAssignedToUserId() != null) {
            User assignee = userRepository.findById(incident.getAssignedToUserId()).orElse(null);
            String name = assignee != null ? assignee.getFullName() : "inconnu";
            throw new IllegalStateException("Cet incident a déjà été pris en charge par " + name);
        }

        incident.setAssignedToUserId(l2UserId);
        incident.setStatus(IncidentStatus.INVESTIGATING);
        incidentRepository.save(incident);

        User l2 = userRepository.findById(l2UserId).orElseThrow();
        addTimelineEntry(incidentId, TimelineEntryType.STATUS_CHANGE, l2,
                "Prise en charge par " + l2.getFullName(),
                IncidentStatus.OPEN, IncidentStatus.INVESTIGATING);

        log.info("Incident {} pris en charge par {}", incident.getIncidentNumber(), l2.getUsername());
    }

    // =================================================================
    // CHANGER LE STATUT (L2 assigné uniquement)
    // =================================================================

    @Transactional
    public void changeStatus(Long incidentId, IncidentStatus newStatus, String note, Long l2UserId) {
        if (note == null || note.isBlank()) {
            throw new IllegalArgumentException("Une note justificative est obligatoire pour changer le statut");
        }

        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Incident introuvable"));

        // Vérifier que c'est bien le L2 assigné
        if (incident.getAssignedToUserId() == null || !incident.getAssignedToUserId().equals(l2UserId)) {
            throw new AccessDeniedException("Seul le L2 assigné peut modifier le statut de cet incident");
        }

        // Vérifier la transition
        IncidentStatus oldStatus = incident.getStatus();
        if (!IncidentStatusMachine.isAllowed(oldStatus, newStatus)) {
            throw new IllegalArgumentException(IncidentStatusMachine.errorMessage(oldStatus, newStatus));
        }

        incident.setStatus(newStatus);
        incidentRepository.save(incident);

        User l2 = userRepository.findById(l2UserId).orElseThrow();
        addTimelineEntry(incidentId, TimelineEntryType.STATUS_CHANGE, l2, note, oldStatus, newStatus);

        log.info("Incident {} : {} → {} par {}", incident.getIncidentNumber(), oldStatus, newStatus, l2.getUsername());
    }

    // =================================================================
    // RÉASSIGNER (MANAGER uniquement)
    // =================================================================

    @Transactional
    public void reassign(Long incidentId, Long newAssigneeUserId, String note, Long managerUserId) {
        if (note == null || note.isBlank()) {
            throw new IllegalArgumentException("Une note est obligatoire pour la réassignation");
        }

        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Incident introuvable"));

        User newAssignee = userRepository.findById(newAssigneeUserId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur cible introuvable"));

        if (newAssignee.getRole() != Role.L2) {
            throw new IllegalArgumentException("L'incident ne peut être assigné qu'à un analyste L2");
        }

        incident.setAssignedToUserId(newAssigneeUserId);
        incidentRepository.save(incident);

        User manager = userRepository.findById(managerUserId).orElseThrow();
        addTimelineEntry(incidentId, TimelineEntryType.REASSIGNMENT, manager,
                "Réassigné à " + newAssignee.getFullName() + " — " + note,
                null, null);

        log.info("Incident {} réassigné à {} par {}", incident.getIncidentNumber(),
                newAssignee.getUsername(), manager.getUsername());
    }

    // =================================================================
    // RENVOYER AU L1 (L2 assigné — faux positif)
    // =================================================================

    @Transactional
    public void returnToL1(Long incidentId, String justification, Long l2UserId) {
        if (justification == null || justification.isBlank()) {
            throw new IllegalArgumentException("Une justification est obligatoire pour le renvoi au L1");
        }

        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Incident introuvable"));

        if (incident.getAssignedToUserId() == null || !incident.getAssignedToUserId().equals(l2UserId)) {
            throw new AccessDeniedException("Seul le L2 assigné peut renvoyer cet incident");
        }

        // Clôturer l'incident comme faux positif
        incident.setStatus(IncidentStatus.CLOSED_FALSE_POSITIVE);
        incidentRepository.save(incident);

        // Reclassifier les alertes liées
        List<IncidentAlert> links = incidentAlertRepository.findByIncidentId(incidentId);
        for (IncidentAlert link : links) {
            alertRepository.findById(link.getAlertId()).ifPresent(alert -> {
                alert.setStatus(AlertStatus.FALSE_POSITIVE);
                alert.setJustification(justification);
                alertRepository.save(alert);
            });
        }

        User l2 = userRepository.findById(l2UserId).orElseThrow();
        addTimelineEntry(incidentId, TimelineEntryType.CLOSURE, l2,
                "Renvoyé au L1 (faux positif) — " + justification,
                incident.getStatus(), IncidentStatus.CLOSED_FALSE_POSITIVE);

        log.info("Incident {} renvoyé au L1 comme faux positif par {}", incident.getIncidentNumber(), l2.getUsername());
    }

    // =================================================================
    // CLÔTURER (L2 assigné — résolution confirmée)
    // =================================================================

    @Transactional
    public void closeIncident(Long incidentId, String summary, Long l2UserId) {
        if (summary == null || summary.isBlank()) {
            throw new IllegalArgumentException("Un résumé de clôture est obligatoire");
        }

        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Incident introuvable"));

        if (incident.getAssignedToUserId() == null || !incident.getAssignedToUserId().equals(l2UserId)) {
            throw new AccessDeniedException("Seul le L2 assigné peut clôturer cet incident");
        }

        if (incident.getStatus() != IncidentStatus.RESOLVED) {
            throw new IllegalArgumentException("Seul un incident en statut RESOLVED peut être clôturé");
        }

        incident.setStatus(IncidentStatus.CLOSED);
        incidentRepository.save(incident);

        User l2 = userRepository.findById(l2UserId).orElseThrow();
        addTimelineEntry(incidentId, TimelineEntryType.CLOSURE, l2,
                "Incident clôturé — " + summary,
                IncidentStatus.RESOLVED, IncidentStatus.CLOSED);

        log.info("Incident {} clôturé par {}", incident.getIncidentNumber(), l2.getUsername());
    }

    // =================================================================
    // HELPERS
    // =================================================================

    private void addTimelineEntry(Long incidentId, TimelineEntryType type, User author,
                                  String content, IncidentStatus oldStatus, IncidentStatus newStatus) {
        IncidentTimelineEntry entry = new IncidentTimelineEntry();
        entry.setIncidentId(incidentId);
        entry.setEntryType(type);
        entry.setAuthorUserId(author.getId());
        entry.setAuthorFullName(author.getFullName());
        entry.setAuthorRole(author.getRole().name());
        entry.setContent(content);
        entry.setOldStatus(oldStatus);
        entry.setNewStatus(newStatus);
        timelineRepository.save(entry);
    }

    private Map<String, Object> buildIncidentResponse(Incident incident) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", incident.getId());
        response.put("incidentNumber", incident.getIncidentNumber());
        response.put("title", incident.getTitle());
        response.put("severity", incident.getSeverity().name());
        response.put("status", incident.getStatus().name());
        response.put("assignedToUserId", incident.getAssignedToUserId());
        response.put("createdByUserId", incident.getCreatedByUserId());
        response.put("triageNote", incident.getTriageNote());
        response.put("createdAt", incident.getCreatedAt());
        response.put("updatedAt", incident.getUpdatedAt());

        // Résoudre les noms
        if (incident.getAssignedToUserId() != null) {
            userRepository.findById(incident.getAssignedToUserId())
                    .ifPresent(u -> response.put("assignedToFullName", u.getFullName()));
        }
        userRepository.findById(incident.getCreatedByUserId())
                .ifPresent(u -> response.put("createdByFullName", u.getFullName()));

        return response;
    }
}