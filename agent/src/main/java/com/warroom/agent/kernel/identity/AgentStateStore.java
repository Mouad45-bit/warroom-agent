package com.warroom.agent.kernel.identity;

import java.time.Instant;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Contient l'état runtime de l'agent.
 *
 * Stockage mémoire thread-safe exposé via le heartbeat.
 * Tous les compteurs sont additifs (on n'efface pas l'historique
 * entre les heartbeats — le serveur peut calculer les deltas).
 *
 * Compteurs existants :
 *   queuedEvents, deliveredEvents,
 *   lastSuccessfulDeliveryAt, startedAt, lastKnownIdentity
 *
 * Ajouts — observabilité complète :
 *   enrollmentRetries : tentatives d'enrollment avant succès
 *   configRefreshFailures : échecs de refresh de config depuis le boot
 *   componentRestarts : nombre total de redémarrages de collecteurs
 *   quarantinedComponents : noms des composants actuellement en quarantaine
 *   failedBatches : batches d'événements non envoyés (erreur HTTP)
 *   droppedEvents : événements perdus faute de place dans la queue
 */
public class AgentStateStore {

    // ── Compteurs ──────────────────────────────────────────

    private final AtomicLong queuedEvents = new AtomicLong(0);
    private final AtomicLong deliveredEvents = new AtomicLong(0);
    private final AtomicReference<Instant> lastSuccessfulDeliveryAt = new AtomicReference<>(null);
    private final AtomicReference<Instant> startedAt = new AtomicReference<>(null);
    private final AtomicReference<String> lastKnownIdentity = new AtomicReference<>(null);

    /** Nombre de tentatives d'enrollment. */
    private final AtomicLong enrollmentRetries = new AtomicLong(0);

    /** Nombre d'échecs de refresh de configuration. */
    private final AtomicLong configRefreshFailures = new AtomicLong(0);

    /** Nombre total de redémarrages de composants par le supervisor. */
    private final AtomicLong componentRestarts = new AtomicLong(0);

    /**
     * Noms des composants actuellement en quarantaine.
     *
     * ConcurrentHashMap.newKeySet() donne un Set thread-safe.
     * On ajoute quand un composant passe QUARANTINED,
     * on retire si le statut change (hot-reload ou redémarrage agent).
     */
    private final Set<String> quarantinedComponents = ConcurrentHashMap.newKeySet();

    /** Nombre de batches d'événements non envoyés au serveur. */
    private final AtomicLong failedBatches = new AtomicLong(0);

    /** Nombre d'événements rejetés car la queue était pleine. */
    private final AtomicLong droppedEvents = new AtomicLong(0);

    // ── Getters existants ────────────────────────────────────────────

    public long getQueuedEvents() { return queuedEvents.get(); }
    public long getDeliveredEvents() { return deliveredEvents.get(); }
    public Instant getLastSuccessfulDeliveryAt() { return lastSuccessfulDeliveryAt.get(); }
    public Instant getStartedAt() { return startedAt.get(); }
    public String getLastKnownIdentity() { return lastKnownIdentity.get(); }
    public long getEnrollmentRetries() { return enrollmentRetries.get(); }
    public long getConfigRefreshFailures() { return configRefreshFailures.get(); }
    public long getComponentRestarts() { return componentRestarts.get(); }
    public Set<String> getQuarantinedComponents() { return Collections.unmodifiableSet(quarantinedComponents); }
    public long getFailedBatches() { return failedBatches.get(); }
    public long getDroppedEvents() { return droppedEvents.get(); }

    // ── Setters/incrementeurs existants ──────────────────────────────

    public void incrementQueuedEvents(long delta) { queuedEvents.addAndGet(delta); }
    public void incrementDeliveredEvents(long delta) { deliveredEvents.addAndGet(delta); }
    public void markLastSuccessfulDeliveryAt(Instant instant) { lastSuccessfulDeliveryAt.set(instant); }
    public void markAgentStartedAt(Instant instant) { startedAt.set(instant); }
    public void markLastKnownIdentity(String agentId) { lastKnownIdentity.set(agentId); }

    /** Appelé par RetryExecutor / AgentBootstrap à chaque tentative d'enrollment. */
    public void incrementEnrollmentRetries() { enrollmentRetries.incrementAndGet(); }

    /** Appelé par ConfigRefreshScheduler quand refreshSafely() échoue. */
    public void incrementConfigRefreshFailures() { configRefreshFailures.incrementAndGet(); }

    /** Appelé par AgentSupervisor.tryStart() après un redémarrage de composant. */
    public void incrementComponentRestarts() { componentRestarts.incrementAndGet(); }

    /** Appelé par AgentSupervisor quand un composant passe en QUARANTINED. */
    public void markComponentQuarantined(String componentName) {
        quarantinedComponents.add(componentName);
    }

    /** Appelé par AgentSupervisor quand un composant sort de quarantaine (hot-reload). */
    public void markComponentUnquarantined(String componentName) {
        quarantinedComponents.remove(componentName);
    }

    /** Appelé par EventBatcher quand un HTTP POST d'événements échoue. */
    public void incrementFailedBatches() { failedBatches.incrementAndGet(); }

    /** Appelé par LocalEventQueue quand offer() rejette un événement (queue pleine). */
    public void incrementDroppedEvents() { droppedEvents.incrementAndGet(); }
}