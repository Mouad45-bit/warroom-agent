package com.warroom.agent.kernel.model;

/**
 * Snapshot santé d'un composant supervisé.
 */
public record ComponentHealth(
        String componentName,
        boolean running,
        String statusMessage
) {
}