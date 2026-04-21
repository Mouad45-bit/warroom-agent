package com.warroom.server.dto;

import java.time.Instant;

/**
 * Représente un événement de sécurité reçu depuis un agent.
 */
public record EnvelopedEventDto(
        String agentId,
        String hostname,
        String sourceType,
        Instant collectedAt,
        String payload
) {}