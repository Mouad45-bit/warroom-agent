package com.warroom.server.controller;

import com.warroom.server.dto.AgentConfigDto;
import com.warroom.server.dto.AgentHealthSnapshotDto;
import com.warroom.server.dto.EnrollmentRequest;
import com.warroom.server.dto.EnrollmentResponse;
import com.warroom.server.service.AgentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agents")
public class AgentController {

    private final AgentService agentService;

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
    }

    //
    @PostMapping("/enroll")
    public ResponseEntity<EnrollmentResponse> enroll(@RequestBody EnrollmentRequest request) {
        EnrollmentResponse response = agentService.enrollAgent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{agentId}/config")
    public ResponseEntity<AgentConfigDto> getConfig(
            @PathVariable String agentId,
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
            @PathVariable String agentId,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody AgentHealthSnapshotDto snapshot) {

        if (!agentService.isAuthorized(agentId, authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        agentService.processHeartbeat(agentId, snapshot);
        return ResponseEntity.status(HttpStatus.OK).build();
    }
}