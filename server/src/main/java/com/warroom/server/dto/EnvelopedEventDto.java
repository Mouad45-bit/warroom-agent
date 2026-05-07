package com.warroom.server.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.datatype.jsr310.deser.InstantDeserializer;

import java.time.Instant;

/**
 * Représente un événement de sécurité reçu depuis un agent.
 */
public record EnvelopedEventDto(
        String agentId,
        String hostname,
        String sourceType,
        @JsonDeserialize(using = InstantDeserializer.class)
        Instant collectedAt,
        String payload
) {}