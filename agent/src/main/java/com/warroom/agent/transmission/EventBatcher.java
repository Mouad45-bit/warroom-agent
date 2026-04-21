package com.warroom.agent.transmission;

import com.warroom.agent.kernel.config.AgentConfigManager;
import com.warroom.agent.kernel.enrollment.AgentEnrollmentClient;
import com.warroom.agent.kernel.identity.AgentAuthStore;
import com.warroom.agent.kernel.identity.AgentStateStore;
import com.warroom.agent.transmission.model.EnvelopedEvent;
import com.warroom.agent.transmission.model.RawEvent;

import java.net.InetAddress;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

public class EventBatcher {

    private final LocalEventQueue queue;
    private final AgentEnrollmentClient client;
    private final AgentAuthStore authStore;
    private final AgentConfigManager configManager;
    private final AgentStateStore stateStore;

    private ScheduledExecutorService scheduler;
    private volatile boolean running = false;
    private String hostname;

    public EventBatcher(LocalEventQueue queue, AgentEnrollmentClient client, AgentAuthStore authStore, AgentConfigManager configManager, AgentStateStore stateStore) {
        this.queue = queue;
        this.client = client;
        this.authStore = authStore;
        this.configManager = configManager;
        this.stateStore = stateStore;
        try {
            this.hostname = InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            this.hostname = "unknown-host";
        }
    }

    public synchronized void start() {
        if (running) return;

        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "agent-batcher-thread");
            t.setDaemon(true);
            return t;
        });

        // Le batcher vérifie la file d'attente toutes les 2 secondes
        scheduler.scheduleWithFixedDelay(this::processBatch, 2, 2, TimeUnit.SECONDS);
        running = true;
        System.out.println("[Transmission] Batcher started.");
    }

    public synchronized void stop() {
        if (!running) return;
        scheduler.shutdownNow();
        running = false;
        System.out.println("[Transmission] Batcher stopped.");
    }

    private void processBatch() {
        int batchSize = configManager.getActiveConfig().getBatchSize();
        List<RawEvent> rawEvents = queue.drainBatch(batchSize);

        if (rawEvents.isEmpty()) {
            return; // Rien à envoyer
        }

        authStore.loadIdentity().ifPresent(identity -> {
            try {
                // Étape 1 : Emballer les événements bruts
                List<EnvelopedEvent> envelopedEvents = rawEvents.stream()
                        .map(raw -> new EnvelopedEvent(
                                identity.agentId(),
                                hostname,
                                raw.sourceType(),
                                Instant.now(),
                                raw.payload()
                        ))
                        .collect(Collectors.toList());

                // Étape 2 : Envoyer au serveur
                client.sendEvents(identity, envelopedEvents);

                // Étape 3 : Mettre à jour les métriques
                stateStore.incrementDeliveredEvents(envelopedEvents.size());
                System.out.println("[Transmission] " + envelopedEvents.size() + " events sent successfully.");

            } catch (Exception e) {
                System.err.println("[Transmission] Sending failed, events are lost : " + e.getMessage());
                // Dans une version avancée, on remettrait les événements dans la file ici (Retry).
            }
        });
    }
}