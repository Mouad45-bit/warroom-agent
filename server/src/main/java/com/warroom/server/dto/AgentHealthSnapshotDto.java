package com.warroom.server.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AgentHealthSnapshotDto(
        String agentId,
        String hostname,
        Instant timestamp,
        boolean running,
        long queuedEvents,
        long deliveredEvents,
        Instant lastSuccessfulDeliveryAt,
        Instant startedAt,
        List<ComponentHealthDto> componentHealth,
        long failedBatches,
        long droppedEvents,
        long enrollmentRetries,
        long configRefreshFailures,
        long componentRestarts,
        Set<String> quarantinedComponents

) {}
