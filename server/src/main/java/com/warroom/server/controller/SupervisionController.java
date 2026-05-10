package com.warroom.server.controller;

import com.warroom.server.dto.AgentDetailResponse;
import com.warroom.server.dto.AgentSummaryDto;
import com.warroom.server.service.SupervisionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/supervision/agents")
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
public class SupervisionController {

    private final SupervisionService supervisionService;

    public SupervisionController(SupervisionService supervisionService) {
        this.supervisionService = supervisionService;
    }

    // -----------------------------------------------------------------
    // GET /api/supervision/agents — Liste le parc informatique (statut dynamique)
    // -----------------------------------------------------------------
    @GetMapping
    public ResponseEntity<List<AgentSummaryDto>> getAllAgents() {
        return ResponseEntity.ok(supervisionService.getAllAgentsSummary());
    }

    // -----------------------------------------------------------------
    // GET /api/supervision/agents/{agentId} — Détail complet exigé par le contrat
    // -----------------------------------------------------------------
    @GetMapping("/{agentId}")
    public ResponseEntity<?> getAgentDetail(@PathVariable("agentId") String agentId) {
        try {
            AgentDetailResponse detail = supervisionService.getAgentDetail(agentId);
            return ResponseEntity.ok(detail);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}