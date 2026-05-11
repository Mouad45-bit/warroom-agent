package com.warroom.server.controller;

import com.warroom.server.dto.AgentConfigDto;
import com.warroom.server.entity.User;
import com.warroom.server.model.AuditAction;
import com.warroom.server.model.AuditTargetType;
import com.warroom.server.repository.AgentRepository;
import com.warroom.server.repository.UserRepository;
import com.warroom.server.service.AuditService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/admin/agents")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AgentRepository agentRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public AdminController(AgentRepository agentRepository,
                           UserRepository userRepository,
                           AuditService auditService) {
        this.agentRepository = agentRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @PutMapping("/{agentId}/config")
    public ResponseEntity<?> updateAgentConfig(@PathVariable("agentId") String agentId,
                                               @RequestBody AgentConfigDto newConfig,
                                               Authentication auth) {
        return agentRepository.findById(agentId).map(agent -> {
            // Construire le diff pour l'audit
            String diff = String.format("heartbeat=%d→%d, batch=%d→%d, retry=%d→%d, collectors=%s→%s",
                    agent.getHeartbeatIntervalSeconds(), newConfig.heartbeatIntervalSeconds(),
                    agent.getBatchSize(), newConfig.batchSize(),
                    agent.getRetryIntervalSeconds(), newConfig.retryIntervalSeconds(),
                    agent.getEnabledCollectors(), newConfig.enabledCollectors());

            agent.setHeartbeatIntervalSeconds(newConfig.heartbeatIntervalSeconds());
            agent.setBatchSize(newConfig.batchSize());
            agent.setRetryIntervalSeconds(newConfig.retryIntervalSeconds());
            agent.setEnabledCollectors(newConfig.enabledCollectors());

            agentRepository.save(agent);
            log.info("Configuration mise à jour pour l'agent {}", agentId);

            // *** MODULE 6 — AUDIT AGENT_CONFIG_CHANGED ***
            User admin = userRepository.findByUsername(auth.getName()).orElse(null);
            if (admin != null) {
                auditService.log(admin.getId(), admin.getFullName(), admin.getRole().name(),
                        AuditAction.AGENT_CONFIG_CHANGED, AuditTargetType.AGENT,
                        agentId, agent.getHostname(), diff);
            }

            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}