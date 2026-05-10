package com.warroom.server.controller;

import com.warroom.server.dto.AgentConfigDto;
import com.warroom.server.entity.Agent;
import com.warroom.server.repository.AgentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/admin/agents")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN')")// Autorise le Dashboard à faire des requêtes
public class AdminController {

    private final AgentRepository agentRepository;

    public AdminController(AgentRepository agentRepository) {
        this.agentRepository = agentRepository;
    }

    @PutMapping("/{agentId}/config")
    public ResponseEntity<?> updateAgentConfig(@PathVariable String agentId, @RequestBody AgentConfigDto newConfig) {
        return agentRepository.findById(agentId).map(agent -> {
            // On met à jour la configuration de l'agent
            agent.setHeartbeatIntervalSeconds(newConfig.heartbeatIntervalSeconds());
            agent.setBatchSize(newConfig.batchSize());
            agent.setRetryIntervalSeconds(newConfig.retryIntervalSeconds());
            agent.setEnabledCollectors(newConfig.enabledCollectors());

            agentRepository.save(agent);
            log.info("Configuration mise à jour pour l'agent {}", agentId);

            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}