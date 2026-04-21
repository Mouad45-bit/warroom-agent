package com.warroom.agent.kernel.heartbeat;

import com.warroom.agent.kernel.model.AgentHealthSnapshot;
import com.warroom.agent.kernel.model.AgentIdentity;
import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.kernel.config.AgentConfigManager;
import com.warroom.agent.kernel.config.ConfigChangeListener;
import com.warroom.agent.kernel.enrollment.AgentEnrollmentClient;
import com.warroom.agent.kernel.identity.AgentAuthStore;
import com.warroom.agent.kernel.identity.AgentStateStore;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Envoie périodiquement l'état santé de l'agent au backend.
 *
 * Implémente ConfigChangeListener pour réagir aux changements
 * d'intervalle de heartbeat poussés par le serveur.
 * Si heartbeatIntervalSeconds change, le service se redémarre
 * automatiquement avec le nouvel intervalle.
 */
public class HeartbeatService implements ConfigChangeListener {

    private final AgentAuthStore authStore;
    private final AgentConfigManager configManager;
    private final HealthReporter healthReporter;
    private final AgentEnrollmentClient enrollmentClient;
    private final AgentStateStore stateStore;

    private ScheduledExecutorService scheduler;
    private volatile boolean started = false;

    /** Intervalle courant pour détecter les vrais changements. */
    private volatile int currentIntervalSeconds;

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
        currentIntervalSeconds = Math.max(5, config.getHeartbeatIntervalSeconds());

        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "agent-heartbeat-thread");
            t.setDaemon(true);
            return t;
        });

        scheduler.scheduleAtFixedRate(
                this::sendHeartbeatSafely,
                currentIntervalSeconds,
                currentIntervalSeconds,
                TimeUnit.SECONDS
        );

        started = true;
        System.out.println("[Heartbeat] Service started. interval=" + currentIntervalSeconds + "s");
    }

    public synchronized void stop() {
        if (!started) {
            return;
        }

        scheduler.shutdownNow();
        started = false;
        System.out.println("[Heartbeat] Service stopped.");
    }

    // ── ConfigChangeListener ─────────────────────────────────────────

    /**
     * Réagit à un changement de configuration.
     *
     * On ne redémarre le scheduler que si heartbeatIntervalSeconds
     * a réellement changé. Si seul le batchSize a bougé par exemple,
     * le heartbeat n'a rien à faire.
     */
    @Override
    public void onConfigChanged(AgentConfig oldConfig, AgentConfig newConfig) {
        int newInterval = Math.max(5, newConfig.getHeartbeatIntervalSeconds());

        if (newInterval != currentIntervalSeconds) {
            System.out.println("[Heartbeat] Interval changed : "
                    + currentIntervalSeconds + "s -> " + newInterval + "s. Restarting...");
            stop();
            start();
        }
    }

    // ── Envoi du heartbeat ───────────────────────────────────────────

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