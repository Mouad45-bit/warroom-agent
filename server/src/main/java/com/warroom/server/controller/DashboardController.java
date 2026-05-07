package com.warroom.server.controller;

import com.warroom.server.entity.AlertRecord;
import com.warroom.server.repository.AlertRecordRepository;
import com.warroom.server.service.SseNotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*") // Crucial pour que le frontend puisse appeler l'API
public class DashboardController {

    private final SseNotificationService sseService;
    private final AlertRecordRepository alertRepository;

    public DashboardController(SseNotificationService sseService, AlertRecordRepository alertRepository) {
        this.sseService = sseService;
        this.alertRepository = alertRepository;
    }

    /**
     * Route de flux en temps réel
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAlerts() {
        log.info("Nouveau client connecté au flux SOC.");
        return sseService.subscribe();
    }

    /**
     * Récupère l'historique des alertes au chargement de la page
     */
    @GetMapping("/alerts/history")
    public List<AlertRecord> getHistory() {
        return alertRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }
}