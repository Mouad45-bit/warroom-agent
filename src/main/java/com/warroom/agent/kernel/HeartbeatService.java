package com.warroom.agent.kernel;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Envoie périodiquement l'état santé de l'agent au backend.
 *
 * Le heartbeat sert à répondre à la question :
 * "L'agent est-il vivant, configuré et opérationnel ?"
 */
public class HeartbeatService {

    private final AgentAuthStore authStore;
    private final AgentConfigManager configManager;
    private final HealthReporter healthReporter;
    private final AgentEnrollmentClient enrollmentClient;
    private final AgentStateStore stateStore;

    private ScheduledExecutorService scheduler;
    private volatile boolean started = false;

    public HeartbeatService(
            AgentAuthStore authStore,
            AgentConfigManager configManager,
            HealthReporter healthReporter,
            AgentEnrollmentClient enrollmentClient,
            AgentStateStore stateStore
    ) {
        this.authStore = authStore;
        this.configManager = configManager;
        this.healthReporter = healthReporter;
        this.enrollmentClient = enrollmentClient;
        this.stateStore = stateStore;
    }

    public synchronized void start() {
        if (started) {
            return;
        }

        AgentConfig config = configManager.getActiveConfig();
        int interval = Math.max(5, config.getHeartbeatIntervalSeconds());

        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "agent-heartbeat-thread");
            t.setDaemon(true);
            return t;
        });

        scheduler.scheduleAtFixedRate(this::sendHeartbeatSafely, interval, interval, TimeUnit.SECONDS);
        started = true;

        System.out.println("[Heartbeat] Service started. interval=" + interval + "s");
    }

    public synchronized void stop() {
        if (!started) {
            return;
        }

        scheduler.shutdownNow();
        started = false;
        System.out.println("[Heartbeat] Service stopped.");
    }

    private void sendHeartbeatSafely() {
        try {
            Optional<AgentIdentity> optionalIdentity = authStore.loadIdentity();

            if (optionalIdentity.isEmpty()) {
                System.err.println("[Heartbeat] No agents enlisted. Heartbeat ignored.");
                return;
            }

            AgentIdentity identity = optionalIdentity.get();
            AgentHealthSnapshot snapshot = healthReporter.build(identity.agentId());

            enrollmentClient.sendHeartbeat(identity, snapshot);

            stateStore.markLastSuccessfulDeliveryAt(Instant.now());
            System.out.println("[Heartbeat] Heartbeat sent successfully.");
        } catch (Exception e) {
            System.err.println("[Heartbeat] Heartbeat sending failed : " + e.getMessage());
        }
    }
}