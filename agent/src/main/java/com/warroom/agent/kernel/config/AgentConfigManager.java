package com.warroom.agent.kernel.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.warroom.agent.kernel.identity.AgentAuthStore;
import com.warroom.agent.kernel.enrollment.AgentEnrollmentClient;
import com.warroom.agent.kernel.model.AgentIdentity;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Gère la configuration active de l'agent.
 *
 * Stratégie de chargement :
 * - si possible, récupérer la config distante via le backend ;
 * - si échec, retomber sur le cache local ;
 * - si rien n'existe, utiliser une config par défaut.
 *
 * Ajout détection de changements :
 * - refreshConfig() compare l'ancienne config avec la nouvelle ;
 * - si elles diffèrent, tous les listeners enregistrés sont notifiés ;
 * - les listeners sont stockés dans une CopyOnWriteArrayList (thread-safe,
 *   peu d'écritures après le boot, lectures fréquentes à chaque refresh).
 */
public class AgentConfigManager {

    private final Path configCacheFile;
    private final ObjectMapper objectMapper;
    private final AgentEnrollmentClient enrollmentClient;
    private final AgentAuthStore authStore;

    private volatile AgentConfig activeConfig = new AgentConfig();

    /**
     * Liste des listeners notifiés lors d'un changement de configuration.
     *
     * CopyOnWriteArrayList car :
     * - les inscriptions se font au boot (rare) ;
     * - les itérations se font à chaque refresh (fréquent) ;
     * - thread-safe sans synchronized explicite sur la liste.
     */
    private final List<ConfigChangeListener> listeners = new CopyOnWriteArrayList<>();

    public AgentConfigManager(
            Path configCacheFile,
            ObjectMapper objectMapper,
            AgentEnrollmentClient enrollmentClient,
            AgentAuthStore authStore
    ) {
        this.configCacheFile = configCacheFile;
        this.objectMapper = objectMapper;
        this.enrollmentClient = enrollmentClient;
        this.authStore = authStore;
    }

    /**
     * Inscrit un listener qui sera notifié à chaque changement de config.
     */
    public void registerListener(ConfigChangeListener listener) {
        listeners.add(listener);
    }

    /**
     * Recharge la configuration active.
     *
     * Priorité :
     * 1. configuration distante si identité connue et backend disponible ;
     * 2. cache local si présent ;
     * 3. configuration par défaut sinon.
     *
     * Si la config chargée diffère de l'ancienne, les listeners sont notifiés.
     */
    public synchronized AgentConfig refreshConfig() {
        AgentConfig newConfig = loadConfig();

        // Première invocation (boot) : pas de notification,
        // on initialise juste la config active.
        if (!newConfig.equals(activeConfig)) {
            AgentConfig oldConfig = activeConfig;
            this.activeConfig = newConfig;

            // Ne notifier que si oldConfig n'est pas la config par défaut initiale.
            // Au premier appel (boot), oldConfig est le défaut construit dans le champ,
            // et on ne veut pas déclencher de "changement" pour ça.
            if (oldConfig.getHeartbeatIntervalSeconds() != new AgentConfig().getHeartbeatIntervalSeconds()
                    || !oldConfig.getEnabledCollectors().isEmpty()) {
                notifyListeners(oldConfig, newConfig);
            }
        } else {
            this.activeConfig = newConfig;
        }

        return this.activeConfig;
    }

    public AgentConfig getActiveConfig() {
        return activeConfig;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Méthodes internes
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Charge la config selon la cascade remote → cache → défaut.
     * Méthode extraite de l'ancien refreshConfig() pour séparer
     * le chargement de la détection de changement.
     */
    private AgentConfig loadConfig() {
        // 1. Tentative distante.
        try {
            AgentIdentity identity = authStore.loadIdentity().orElse(null);
            if (identity != null) {
                AgentConfig remoteConfig = enrollmentClient.fetchRemoteConfig(identity);
                saveCache(remoteConfig);
                return remoteConfig;
            }
        } catch (Exception e) {
            System.err.println("[ConfigManager] Unable to load remote configuration : " + e.getMessage());
        }

        // 2. Cache local.
        try {
            if (Files.exists(configCacheFile)) {
                return objectMapper.readValue(configCacheFile.toFile(), AgentConfig.class);
            }
        } catch (Exception e) {
            System.err.println("[ConfigManager] Unable to load local cache : " + e.getMessage());
        }

        // 3. Défaut.
        return new AgentConfig();
    }

    /**
     * Notifie chaque listener enregistré.
     * Les exceptions d'un listener ne bloquent pas les suivants.
     */
    private void notifyListeners(AgentConfig oldConfig, AgentConfig newConfig) {
        System.out.println("[ConfigManager] Configuration changed. Notifying "
                + listeners.size() + " listener(s).");
        System.out.println("[ConfigManager]   old=" + oldConfig);
        System.out.println("[ConfigManager]   new=" + newConfig);

        for (ConfigChangeListener listener : listeners) {
            try {
                listener.onConfigChanged(oldConfig, newConfig);
            } catch (Exception e) {
                System.err.println("[ConfigManager] Listener notification failed : " + e.getMessage());
            }
        }
    }

    private void saveCache(AgentConfig config) {
        try {
            Files.createDirectories(configCacheFile.getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(configCacheFile.toFile(), config);
        } catch (IOException e) {
            throw new IllegalStateException("Unable to write configuration cache", e);
        }
    }
}