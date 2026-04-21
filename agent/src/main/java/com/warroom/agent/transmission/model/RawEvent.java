package com.warroom.agent.transmission.model;

/**
 * Ce que le collecteur produit.
 * Ton collaborateur instanciera cette classe.
 */
public record RawEvent(
        String sourceType, // ex: "linux.auth.log" ou "command.ss"
        String payload     // La donnée textuelle brute
) {}
