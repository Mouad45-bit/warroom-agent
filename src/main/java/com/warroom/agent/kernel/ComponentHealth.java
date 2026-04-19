package com.warroom.agent.kernel;

/**
 * Snapshot santé d'un composant supervisé.
 */
public record ComponentHealth(
        String componentName,
        boolean running,
        String statusMessage
) {
}