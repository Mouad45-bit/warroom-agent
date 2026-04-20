package com.warroom.server.dto;

import java.util.List;

public record AgentHealthSnapshotDto(
        String agentId,
        String hostname,
        String timestamp,
        boolean running,
        long queuedEvents,
        long deliveredEvents,
        String lastSuccessfulDeliveryAt,
        String startedAt,
        List<ComponentHealthDto> componentHealth
) {}
