package com.warroom.server.controller;

import com.warroom.server.dto.AddCountermeasureRequest;
import com.warroom.server.dto.AddNoteRequest;
import com.warroom.server.dto.CreateIncidentRequest;
import com.warroom.server.dto.EscalateAlertRequest;
import com.warroom.server.entity.Incident;
import com.warroom.server.entity.User;
import com.warroom.server.model.IncidentStatus;
import com.warroom.server.model.Role;
import com.warroom.server.model.Severity;
import com.warroom.server.repository.UserRepository;
import com.warroom.server.service.IncidentService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/incidents")
@PreAuthorize("hasAnyRole('L1', 'L2', 'MANAGER')")
public class IncidentController {

    private final IncidentService incidentService;
    private final UserRepository userRepository;

    public IncidentController(IncidentService incidentService, UserRepository userRepository) {
        this.incidentService = incidentService;
        this.userRepository = userRepository;
    }

    // -----------------------------------------------------------------
    // POST /api/incidents — Créer un incident (L1)
    // -----------------------------------------------------------------

    @PostMapping
    @PreAuthorize("hasRole('L1')")
    public ResponseEntity<?> createIncident(@RequestBody CreateIncidentRequest request, Authentication auth) {
        try {
            Long userId = extractUserId(auth);
            Map<String, Object> incident = incidentService.createIncident(request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(incident);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------
    // GET /api/incidents — Liste paginée
    // -----------------------------------------------------------------

    @GetMapping
    // CORRECTION : Page<Incident> devient Page<Map<String, Object>>
    public ResponseEntity<Page<Map<String, Object>>> getIncidents(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "status", required = false) List<IncidentStatus> status,
            @RequestParam(value = "severity", required = false) List<Severity> severity,
            @RequestParam(value = "assignedTo", required = false) Long assignedTo,
            Authentication auth) {

        Long userId = extractUserId(auth);
        Role role = extractRole(auth);

        return ResponseEntity.ok(
                incidentService.getIncidents(page, size, status, severity, assignedTo, userId, role)
        );
    }

    // -----------------------------------------------------------------
    // GET /api/incidents/{incidentId} — Détail complet
    // -----------------------------------------------------------------

    @GetMapping("/{incidentId}")
    public ResponseEntity<?> getIncidentDetail(@PathVariable("incidentId") Long incidentId) {
        try {
            return ResponseEntity.ok(incidentService.getIncidentDetail(incidentId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------
    // PUT /api/incidents/{incidentId}/take — Prendre en charge (L2)
    // -----------------------------------------------------------------

    @PutMapping("/{incidentId}/take")
    @PreAuthorize("hasRole('L2')")
    public ResponseEntity<?> takeIncident(@PathVariable("incidentId") Long incidentId, Authentication auth) {
        try {
            Long userId = extractUserId(auth);
            incidentService.takeIncident(incidentId, userId);
            return ResponseEntity.ok(Map.of("message", "Incident pris en charge", "status", "INVESTIGATING"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------
    // PUT /api/incidents/{incidentId}/status — Changer le statut (L2 assigné)
    // -----------------------------------------------------------------

    @PutMapping("/{incidentId}/status")
    @PreAuthorize("hasRole('L2')")
    public ResponseEntity<?> changeStatus(@PathVariable("incidentId") Long incidentId,
                                          @RequestBody Map<String, String> body,
                                          Authentication auth) {
        try {
            Long userId = extractUserId(auth);
            String newStatusStr = body.get("newStatus");
            String note = body.get("note");

            if (newStatusStr == null || newStatusStr.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Le champ newStatus est obligatoire"));
            }

            IncidentStatus newStatus;
            try {
                newStatus = IncidentStatus.valueOf(newStatusStr.toUpperCase());
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Statut invalide : " + newStatusStr));
            }

            incidentService.changeStatus(incidentId, newStatus, note, userId);
            return ResponseEntity.ok(Map.of("message", "Statut mis à jour", "newStatus", newStatus.name()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------
    // PUT /api/incidents/{incidentId}/reassign — Réassigner (MANAGER)
    // -----------------------------------------------------------------

    @PutMapping("/{incidentId}/reassign")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> reassign(@PathVariable("incidentId") Long incidentId,
                                      @RequestBody Map<String, Object> body,
                                      Authentication auth) {
        try {
            Long managerUserId = extractUserId(auth);
            Long newAssigneeUserId = Long.valueOf(body.get("newAssigneeUserId").toString());
            String note = (String) body.get("note");

            incidentService.reassign(incidentId, newAssigneeUserId, note, managerUserId);
            return ResponseEntity.ok(Map.of("message", "Incident réassigné avec succès"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------
    // PUT /api/incidents/{incidentId}/return-to-l1 — Renvoyer au L1 (L2 assigné)
    // -----------------------------------------------------------------

    @PutMapping("/{incidentId}/return-to-l1")
    @PreAuthorize("hasRole('L2')")
    public ResponseEntity<?> returnToL1(@PathVariable("incidentId") Long incidentId,
                                        @RequestBody Map<String, String> body,
                                        Authentication auth) {
        try {
            Long userId = extractUserId(auth);
            String justification = body.get("justification");

            incidentService.returnToL1(incidentId, justification, userId);
            return ResponseEntity.ok(Map.of("message", "Incident renvoyé au L1 comme faux positif"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------
    // PUT /api/incidents/{incidentId}/close — Clôturer (L2 assigné)
    // -----------------------------------------------------------------

    @PutMapping("/{incidentId}/close")
    @PreAuthorize("hasRole('L2')")
    public ResponseEntity<?> closeIncident(@PathVariable("incidentId") Long incidentId,
                                           @RequestBody Map<String, String> body,
                                           Authentication auth) {
        try {
            Long userId = extractUserId(auth);
            String summary = body.get("summary");

            incidentService.closeIncident(incidentId, summary, userId);
            return ResponseEntity.ok(Map.of("message", "Incident clôturé avec succès"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------
// POST /api/incidents/{incidentId}/countermeasures — Ajouter une contre-mesure (L2)
// -----------------------------------------------------------------

    @PostMapping("/{incidentId}/countermeasures")
    @PreAuthorize("hasRole('L2')")
    public ResponseEntity<?> addCountermeasure(@PathVariable("incidentId") Long incidentId,
                                               @RequestBody AddCountermeasureRequest request,
                                               Authentication auth) {
        try {
            Long userId = extractUserId(auth);
            Map<String, Object> response = incidentService.addCountermeasure(incidentId, request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

// -----------------------------------------------------------------
// POST /api/incidents/{incidentId}/notes — Ajouter une note (L2, L1, Manager)
// -----------------------------------------------------------------

    @PostMapping("/{incidentId}/notes")
    @PreAuthorize("hasAnyRole('L1', 'L2', 'MANAGER')")
    public ResponseEntity<?> addNote(@PathVariable("incidentId") Long incidentId,
                                     @RequestBody AddNoteRequest request,
                                     Authentication auth) {
        try {
            Long userId = extractUserId(auth);
            Role role = extractRole(auth);
            Map<String, Object> response = incidentService.addNote(incidentId, request.content(), userId, role);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------
    // GET /api/incidents/l2-analysts — Liste des L2 pour assignation
    // -----------------------------------------------------------------
    @GetMapping("/l2-analysts")
    public ResponseEntity<?> getL2Analysts() {
        List<Map<String, Object>> l2Users = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.L2 && u.isActive())
                .map(u -> Map.<String,Object>of("userId", u.getId(), "fullName", u.getFullName()))
                .toList();

        return ResponseEntity.ok(l2Users);
    }

    // -----------------------------------------------------------------
    // Utilitaires
    // -----------------------------------------------------------------

    private Long extractUserId(Authentication auth) {
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalStateException("Utilisateur introuvable"));
        return user.getId();
    }

    private Role extractRole(Authentication auth) {
        String roleString = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.replace("ROLE_", ""))
                .findFirst()
                .orElse("L1");
        return Role.valueOf(roleString);
    }
}