package com.warroom.agent.kernel.config;

import com.warroom.agent.kernel.identity.AgentStateStore;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Interroge périodiquement le serveur pour recharger la configuration.
 *
 * Modification :
 * - reçoit un AgentStateStore pour compter les échecs de refresh
 *   (configRefreshFailures).
 */
public class ConfigRefreshScheduler {

    private static final int REFRESH_INTERVAL_SECONDS = 60;

    private final AgentConfigManager configManager;
    private final AgentStateStore stateStore;
    private ScheduledExecutorService scheduler;
    private volatile boolean running = false;

    public ConfigRefreshScheduler(AgentConfigManager configManager, AgentStateStore stateStore) {
        this.configManager = configManager;
        this.stateStore = stateStore;
    }

    public synchronized void start() {
        if (running) return;

        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "agent-config-refresh");
            t.setDaemon(true);
            return t;
        });

        scheduler.scheduleWithFixedDelay(
                this::refreshSafely,
                REFRESH_INTERVAL_SECONDS,
                REFRESH_INTERVAL_SECONDS,
                TimeUnit.SECONDS
        );

        running = true;
        System.out.println("[ConfigRefresh] Scheduler started. interval=" + REFRESH_INTERVAL_SECONDS + "s");
    }

    public synchronized void stop() {
        if (!running) return;
        scheduler.shutdownNow();
        running = false;
        System.out.println("[ConfigRefresh] Scheduler stopped.");
    }

    private void refreshSafely() {
        try {
            configManager.refreshConfig();
        } catch (Exception e) {
            stateStore.incrementConfigRefreshFailures();
            System.err.println("[ConfigRefresh] Refresh failed : " + e.getMessage());
        }
    }
}