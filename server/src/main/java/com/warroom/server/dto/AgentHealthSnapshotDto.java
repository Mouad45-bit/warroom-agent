package com.warroom.server.dto;

import java.util.List;
import java.util.Set;

/**
 * DTO du heartbeat reçu par le serveur depuis un agent.
 *
 * Miroir de AgentHealthSnapshot côté agent.
 * Spring désérialise automatiquement le JSON via Jackson.
 */
public record AgentHealthSnapshotDto(
        String agentId,
        String hostname,
        String timestamp,
        boolean running,

        // Transmission
        long queuedEvents,
        long deliveredEvents,
        String lastSuccessfulDeliveryAt,
        long failedBatches,
        long droppedEvents,

        // Cycle de vie
        String startedAt,
        long enrollmentRetries,

        // Configuration
        long configRefreshFailures,

        // Composants
        long componentRestarts,
        Set<String> quarantinedComponents,
        List<ComponentHealthDto> componentHealth
) {}