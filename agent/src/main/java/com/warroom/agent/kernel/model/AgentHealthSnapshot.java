package com.warroom.agent.kernel.model;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Représente l'état technique global de l'agent à un instant T.
 *
 * Ce snapshot est envoyé au backend via heartbeat.
 *
 * Ajouts :
 *   enrollmentRetries, configRefreshFailures, componentRestarts,
 *   quarantinedComponents, failedBatches, droppedEvents
 */
public record AgentHealthSnapshot(
        String agentId,
        String hostname,
        Instant timestamp,
        boolean running,

        // ── Transmission ────────────────────────────────────────────
        long queuedEvents,
        long deliveredEvents,
        Instant lastSuccessfulDeliveryAt,
        long failedBatches,
        long droppedEvents,

        // ── Cycle de vie ─────────────────────────────────────────────
        Instant startedAt,
        long enrollmentRetries,

        // ── Configuration ────────────────────────────────────────────
        long configRefreshFailures,

        // ── Composants ───────────────────────────────────────────────
        long componentRestarts,
        Set<String> quarantinedComponents,
        List<ComponentHealth> componentHealth
) {}