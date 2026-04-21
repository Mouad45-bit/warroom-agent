package com.warroom.agent.kernel.config;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Interroge périodiquement le serveur pour recharger la configuration.
 *
 * Ce composant est volontairement simple :
 * - il appelle configManager.refreshConfig() à intervalle fixe ;
 * - il ne sait rien du contenu de la config ;
 * - la détection de changement et la notification sont
 *   gérées par le ConfigManager lui-même.
 *
 * L'intervalle de poll est fixé à 60 secondes.
 * C'est un compromis entre réactivité et charge réseau.
 * Pour un agent SOC, une minute de latence pour appliquer
 * un changement de config est largement acceptable.
 */
public class ConfigRefreshScheduler {

    private static final int REFRESH_INTERVAL_SECONDS = 60;

    private final AgentConfigManager configManager;
    private ScheduledExecutorService scheduler;
    private volatile boolean running = false;

    public ConfigRefreshScheduler(AgentConfigManager configManager) {
        this.configManager = configManager;
    }

    public synchronized void start() {
        if (running) {
            return;
        }

        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "agent-config-refresh");
            t.setDaemon(true);
            return t;
        });

        // Le premier refresh est décalé d'un cycle complet :
        // la config vient d'être chargée au boot, inutile de re-poller immédiatement.
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
        if (!running) {
            return;
        }

        scheduler.shutdownNow();
        running = false;
        System.out.println("[ConfigRefresh] Scheduler stopped.");
    }

    /**
     * Wrapper qui absorbe les exceptions.
     * Un échec de refresh ne doit jamais tuer le scheduler —
     * on réessaiera au prochain cycle.
     */
    private void refreshSafely() {
        try {
            configManager.refreshConfig();
        } catch (Exception e) {
            System.err.println("[ConfigRefresh] Refresh failed : " + e.getMessage());
        }
    }
}