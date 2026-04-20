package com.warroom.agent.kernel.model;

import java.time.Instant;
import java.util.List;

/**
 * Représente l'état technique global de l'agent à un instant T.
 *
 * Ce snapshot est envoyé au backend via heartbeat.
 */
public record AgentHealthSnapshot(
        String agentId,
        String hostname,
        Instant timestamp,
        boolean running,
        long queuedEvents,
        long deliveredEvents,
        Instant lastSuccessfulDeliveryAt,
        Instant startedAt,
        List<ComponentHealth> componentHealth
) {
}