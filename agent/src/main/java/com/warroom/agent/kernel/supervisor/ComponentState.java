package com.warroom.agent.kernel.supervisor;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * État runtime d'un composant supervisé.
 *
 * Contient :
 * - le statut courant (RUNNING, CRASHED, QUARANTINED, DISABLED) ;
 * - l'historique des crashes récents (pour détecter la boucle) ;
 * - le nombre de redémarrages successifs (pour calculer le backoff) ;
 * - le prochain timestamp de redémarrage (None si pas planifié).
 *
 * Cette classe est volontairement mutable et encapsulée :
 * le Supervisor est le seul à la modifier, sous verrou synchronized.
 */
class ComponentState {

    /** Fenêtre glissante pour détecter les crashes répétés. */
    private static final long CRASH_WINDOW_MS = 5 * 60 * 1000L; // 5 minutes

    /** Nombre max de crashes dans la fenêtre avant quarantaine. */
    private static final int MAX_CRASHES_IN_WINDOW = 5;

    /** Backoff initial après un crash. */
    private static final long INITIAL_BACKOFF_MS = 5_000L;

    /** Backoff maximum (plafond). */
    private static final long MAX_BACKOFF_MS = 60_000L;

    /** Facteur multiplicatif du backoff. */
    private static final double BACKOFF_MULTIPLIER = 2.0;

    private final String componentName;
    private ComponentStatus status;
    private final Deque<Instant> recentCrashes = new ArrayDeque<>();
    private int consecutiveRestarts = 0;
    private Instant nextRestartAt = null;
    private String lastErrorMessage = null;

    ComponentState(String componentName, ComponentStatus initialStatus) {
        this.componentName = componentName;
        this.status = initialStatus;
    }

    String componentName() {
        return componentName;
    }

    ComponentStatus status() {
        return status;
    }

    void setStatus(ComponentStatus status) {
        this.status = status;
    }

    String lastErrorMessage() {
        return lastErrorMessage;
    }

    /**
     * Enregistre un crash et détermine la suite :
     * - si trop de crashes dans la fenêtre : quarantaine ;
     * - sinon : état CRASHED + planification du prochain redémarrage.
     */
    void recordCrash(String errorMessage) {
        Instant now = Instant.now();
        this.lastErrorMessage = errorMessage;

        // Nettoyer la fenêtre glissante : retirer les crashes trop anciens.
        while (!recentCrashes.isEmpty()
                && recentCrashes.peekFirst().isBefore(now.minusMillis(CRASH_WINDOW_MS))) {
            recentCrashes.pollFirst();
        }
        recentCrashes.offerLast(now);

        if (recentCrashes.size() >= MAX_CRASHES_IN_WINDOW) {
            this.status = ComponentStatus.QUARANTINED;
            this.nextRestartAt = null;
            System.err.println("[Supervisor] " + componentName
                    + " quarantined after " + recentCrashes.size() + " crashes.");
        } else {
            this.status = ComponentStatus.CRASHED;
            long backoff = computeBackoff();
            this.nextRestartAt = now.plusMillis(backoff);
            System.out.println("[Supervisor] " + componentName
                    + " crashed. Restart in " + (backoff / 1000) + "s "
                    + "(attempt " + (consecutiveRestarts + 1) + ").");
        }
    }

    /**
     * Appelé après un redémarrage réussi.
     * Le compteur consécutif est remis à zéro,
     * mais l'historique de crashes reste pour la détection de quarantaine.
     */
    void recordRestartSuccess() {
        this.status = ComponentStatus.RUNNING;
        this.consecutiveRestarts = 0;
        this.nextRestartAt = null;
        this.lastErrorMessage = null;
    }

    /**
     * Appelé avant une tentative de redémarrage pour incrémenter le backoff.
     */
    void markRestartAttempt() {
        this.consecutiveRestarts++;
    }

    /**
     * Indique si le composant est prêt à être redémarré
     * (statut CRASHED et délai de backoff écoulé).
     */
    boolean isReadyToRestart() {
        return status == ComponentStatus.CRASHED
                && nextRestartAt != null
                && Instant.now().isAfter(nextRestartAt);
    }

    /**
     * Calcule le backoff courant :
     * 5s, 10s, 20s, 40s, puis plafonné à 60s.
     */
    private long computeBackoff() {
        double delay = INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, consecutiveRestarts);
        return (long) Math.min(delay, MAX_BACKOFF_MS);
    }
}