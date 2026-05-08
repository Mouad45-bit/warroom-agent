package com.warroom.agent.transmission.model;

import java.time.Instant;

/**
 * Ce que le Batcher envoie au serveur (enrichi avec le contexte de l'agent).
 */
public record EnvelopedEvent(
        String agentId,
        String hostname,
        String sourceType,
        Instant collectedAt,
        String payload
) {}
