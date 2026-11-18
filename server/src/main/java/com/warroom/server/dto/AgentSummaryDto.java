package com.warroom.server.dto;

import com.warroom.server.model.HealthStatus;
import java.time.Instant;

public record AgentSummaryDto(
        String agentId,
        String hostname,
        String osName,
        String osVersion,
        Instant lastSeenAt,
        HealthStatus healthStatus,     // <-- Remplaçant de l'ancien statut
        int activeCollectors,          // <-- Nouveauté du contrat
        int totalCollectors            // <-- Nouveauté du contrat
) {}