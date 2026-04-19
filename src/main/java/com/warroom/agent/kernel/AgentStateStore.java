package com.warroom.agent.kernel;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Contient l'état runtime de l'agent.
 *
 * C'est un petit stockage mémoire thread-safe.
 * Il sert à exposer des métriques techniques pour le heartbeat.
 */
public class AgentStateStore {

    private final AtomicLong queuedEvents = new AtomicLong(0);
    private final AtomicLong deliveredEvents = new AtomicLong(0);
    private final AtomicReference<Instant> lastSuccessfulDeliveryAt = new AtomicReference<>(null);
    private final AtomicReference<Instant> startedAt = new AtomicReference<>(null);
    private final AtomicReference<String> lastKnownIdentity = new AtomicReference<>(null);

    public long getQueuedEvents() {
        return queuedEvents.get();
    }

    public long getDeliveredEvents() {
        return deliveredEvents.get();
    }

    public Instant getLastSuccessfulDeliveryAt() {
        return lastSuccessfulDeliveryAt.get();
    }

    public Instant getStartedAt() {
        return startedAt.get();
    }

    public String getLastKnownIdentity() {
        return lastKnownIdentity.get();
    }

    public void incrementQueuedEvents(long delta) {
        queuedEvents.addAndGet(delta);
    }

    public void incrementDeliveredEvents(long delta) {
        deliveredEvents.addAndGet(delta);
    }

    public void markLastSuccessfulDeliveryAt(Instant instant) {
        lastSuccessfulDeliveryAt.set(instant);
    }

    public void markAgentStartedAt(Instant instant) {
        startedAt.set(instant);
    }

    public void markLastKnownIdentity(String agentId) {
        lastKnownIdentity.set(agentId);
    }
}