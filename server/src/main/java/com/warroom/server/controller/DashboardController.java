package com.warroom.server.controller;

import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.User;
import com.warroom.server.repository.AlertRecordRepository;
import com.warroom.server.repository.UserRepository;
import com.warroom.server.service.DashboardService;
import com.warroom.server.service.NotificationService;
import com.warroom.server.service.SseNotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "http://localhost:5173")
public class DashboardController {

    private final SseNotificationService sseService;
    private final AlertRecordRepository alertRepository;
    private final DashboardService dashboardService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public DashboardController(SseNotificationService sseService,
                               AlertRecordRepository alertRepository,
                               DashboardService dashboardService,
                               NotificationService notificationService,
                               UserRepository userRepository) {
        this.sseService = sseService;
        this.alertRepository = alertRepository;
        this.dashboardService = dashboardService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    // -----------------------------------------------------------------
    // GET /api/dashboard/stream — Flux SSE temps réel (existant)
    // -----------------------------------------------------------------

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAlerts() {
        log.info("Nouveau client connecté au flux SOC.");
        return sseService.subscribe();
    }

    // -----------------------------------------------------------------
    // GET /api/dashboard/alerts/history — Historique des alertes (existant)
    // -----------------------------------------------------------------

    @GetMapping("/alerts/history")
    public List<AlertRecord> getHistory() {
        return alertRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    // -----------------------------------------------------------------
    // GET /api/dashboard/stats — Stats communes (tous les rôles)
    // -----------------------------------------------------------------

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('L1', 'L2', 'MANAGER', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }

    // -----------------------------------------------------------------
    // GET /api/dashboard/stats/manager — Stats Manager uniquement
    // -----------------------------------------------------------------

    @GetMapping("/stats/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getManagerStats() {
        return ResponseEntity.ok(dashboardService.getManagerStats());
    }

    // -----------------------------------------------------------------
    // GET /api/dashboard/notifications — Notifications de l'utilisateur
    // -----------------------------------------------------------------

    @GetMapping("/notifications")
    @PreAuthorize("hasAnyRole('L1', 'L2', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getNotifications(
            @RequestParam(value = "unreadOnly", defaultValue = "true") boolean unreadOnly,
            Authentication auth) {
        Long userId = extractUserId(auth);
        return ResponseEntity.ok(notificationService.getNotifications(userId, unreadOnly));
    }

    // -----------------------------------------------------------------
    // PUT /api/dashboard/notifications/{notifId}/read — Marquer comme lue
    // -----------------------------------------------------------------

    @PutMapping("/notifications/{notifId}/read")
    @PreAuthorize("hasAnyRole('L1', 'L2', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> markAsRead(@PathVariable("notifId") Long notifId, Authentication auth) {
        try {
            Long userId = extractUserId(auth);
            notificationService.markAsRead(notifId, userId);
            return ResponseEntity.ok(Map.of("message", "Notification marquée comme lue"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------
    // Utilitaire
    // -----------------------------------------------------------------

    private Long extractUserId(Authentication auth) {
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalStateException("Utilisateur introuvable"));
        return user.getId();
    }
}