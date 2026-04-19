package com.warroom.agent.kernel;

import java.time.Instant;

/**
 * Représente l'identité durable de l'agent après son enrôlement.
 *
 * Cette identité est stockée localement pour que l'agent
 * n'ait pas besoin de se ré-enrôler à chaque démarrage.
 */
public record AgentIdentity(
        String agentId,
        String apiKey,
        Instant enrolledAt
) {
}