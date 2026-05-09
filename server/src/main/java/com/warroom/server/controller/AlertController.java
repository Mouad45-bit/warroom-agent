package com.warroom.server.controller;

import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.User;
import com.warroom.server.model.AlertStatus;
import com.warroom.server.model.Severity;
import com.warroom.server.repository.UserRepository;
import com.warroom.server.service.AlertService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@PreAuthorize("hasAnyRole('L1', 'L2', 'MANAGER')")
public class AlertController {

    private final AlertService alertService;
    private final UserRepository userRepository;

    public AlertController(AlertService alertService, UserRepository userRepository) {
        this.alertService = alertService;
        this.userRepository = userRepository;
    }

    // -----------------------------------------------------------------
    // GET /api/alerts — Liste paginée avec filtres
    // -----------------------------------------------------------------

    @GetMapping
    public ResponseEntity<Page<AlertRecord>> getAlerts(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "severity", required = false) List<Severity> severity,
            @RequestParam(value = "status", required = false) List<AlertStatus> status,
            @RequestParam(value = "agentId", required = false) String agentId,
            @RequestParam(value = "from", required = false) Instant from,
            @RequestParam(value = "to", required = false) Instant to) {

        return ResponseEntity.ok(
                alertService.getAlerts(page, size, severity, status, agentId, from, to)
        );
    }

    // -----------------------------------------------------------------
    // GET /api/alerts/{alertId} — Détail complet
    // -----------------------------------------------------------------

    @GetMapping("/{alertId}")
    public ResponseEntity<?> getAlertDetail(@PathVariable("alertId") Long alertId) {
        try {
            return ResponseEntity.ok(alertService.getAlertDetail(alertId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------
    // PUT /api/alerts/{alertId}/acknowledge — Acquitter (L1 seul)
    // -----------------------------------------------------------------

    @PutMapping("/{alertId}/acknowledge")
    @PreAuthorize("hasRole('L1')")
    public ResponseEntity<?> acknowledge(@PathVariable("alertId") Long alertId, Authentication auth) {
        try {
            Long userId = extractUserId(auth);
            AlertRecord updated = alertService.acknowledge(alertId, userId);

            return ResponseEntity.ok(Map.of(
                    "id", updated.getId(),
                    "status", updated.getStatus().name(),
                    "qualifiedAt", updated.getQualifiedAt().toString()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------
    // PUT /api/alerts/{alertId}/false-positive — Faux positif (L1 seul)
    // -----------------------------------------------------------------

    @PutMapping("/{alertId}/false-positive")
    @PreAuthorize("hasRole('L1')")
    public ResponseEntity<?> falsePositive(@PathVariable("alertId") Long alertId,
                                           @RequestBody Map<String, String> body,
                                           Authentication auth) {
        try {
            Long userId = extractUserId(auth);
            String justification = body.get("justification");

            AlertRecord updated = alertService.markFalsePositive(alertId, userId, justification);

            return ResponseEntity.ok(Map.of(
                    "id", updated.getId(),
                    "status", updated.getStatus().name(),
                    "qualifiedAt", updated.getQualifiedAt().toString(),
                    "justification", updated.getJustification()
            ));
        } catch (IllegalArgumentException e) {
            if (e.getMessage().contains("justification")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------
    // Utilitaire : extraire l'ID utilisateur depuis la session
    // -----------------------------------------------------------------

    private Long extractUserId(Authentication auth) {
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalStateException("Utilisateur introuvable"));
        return user.getId();
    }
}