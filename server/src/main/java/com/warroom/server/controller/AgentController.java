package com.warroom.server.controller;

import com.warroom.server.dto.*;
import com.warroom.server.service.AgentService;
import lombok.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agents")
public class AgentController {

    private final AgentService agentService;

    // NOUVEAU : On injecte le secret depuis le fichier de configuration.
    // Si la valeur n'est pas dans le fichier, on met une sécurité par défaut.
    @Value("${warroom.enrollment.secret:super-secret-default-key}")
    private String enrollmentSecret;

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
    }

    //
    @PostMapping("/enroll")
    public ResponseEntity<?> enroll(
            @RequestHeader(value = "X-Enrollment-Secret", required = false) String providedSecret,
            @RequestBody EnrollmentRequest request) {

        // NOUVEAU : Vérification stricte du secret partagé
        if (providedSecret == null || !providedSecret.equals(enrollmentSecret)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Accès refusé : Secret d'enrôlement manquant ou invalide.");
        }

        EnrollmentResponse response = agentService.enrollAgent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{agentId}/config")
    public ResponseEntity<AgentConfigDto> getConfig(
            @PathVariable("agentId") String agentId,
            @RequestHeader("Authorization") String authHeader) {

        if (!agentService.isAuthorized(agentId, authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        AgentConfigDto config = agentService.getActiveConfig(agentId);
        return ResponseEntity.status(HttpStatus.OK).body(config);
    }

    //
    @PostMapping("/{agentId}/heartbeat")
    public ResponseEntity<Void> receiveHeartbeat(
            @PathVariable("agentId") String agentId,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody AgentHealthSnapshotDto snapshot) {

        if (!agentService.isAuthorized(agentId, authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        agentService.processHeartbeat(agentId, snapshot);
        return ResponseEntity.status(HttpStatus.OK).build();
    }

    //
    @PostMapping("/{agentId}/events")
    public ResponseEntity<Void> receiveEvents(
            @PathVariable("agentId") String agentId,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody List<EnvelopedEventDto> events) {

        if (!agentService.isAuthorized(agentId, authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        agentService.processEvents(agentId, events);

        return ResponseEntity.status(HttpStatus.OK).build();
    }
}