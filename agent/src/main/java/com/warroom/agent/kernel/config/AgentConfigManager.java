package com.warroom.agent.kernel.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.warroom.agent.kernel.identity.AgentAuthStore;
import com.warroom.agent.kernel.enrollment.AgentEnrollmentClient;
import com.warroom.agent.kernel.model.AgentIdentity;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Gère la configuration active de l'agent.
 *
 * Stratégie :
 * - si possible, récupérer la config distante via le backend ;
 * - si échec, retomber sur le cache local ;
 * - si rien n'existe, utiliser une config par défaut.
 */
public class AgentConfigManager {

    private final Path configCacheFile;
    private final ObjectMapper objectMapper;
    private final AgentEnrollmentClient enrollmentClient;
    private final AgentAuthStore authStore;

    private volatile AgentConfig activeConfig = new AgentConfig();

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
     * Recharge la configuration active.
     *
     * Priorité :
     * 1. configuration distante si identité connue et backend disponible ;
     * 2. cache local si présent ;
     * 3. configuration par défaut sinon.
     */
    public synchronized AgentConfig refreshConfig() {
        try {
            AgentIdentity identity = authStore.loadIdentity().orElse(null);

            if (identity != null) {
                AgentConfig remoteConfig = enrollmentClient.fetchRemoteConfig(identity);
                this.activeConfig = remoteConfig;
                saveCache(remoteConfig);
                return remoteConfig;
            }
        } catch (Exception e) {
            System.err.println("[ConfigManager] Unable to load remote configuration : " + e.getMessage());
        }

        try {
            if (Files.exists(configCacheFile)) {
                AgentConfig cachedConfig = objectMapper.readValue(configCacheFile.toFile(), AgentConfig.class);
                this.activeConfig = cachedConfig;
                return cachedConfig;
            }
        } catch (Exception e) {
            System.err.println("[ConfigManager] Unable to load local cache : " + e.getMessage());
        }

        this.activeConfig = new AgentConfig();
        return this.activeConfig;
    }

    public AgentConfig getActiveConfig() {
        return activeConfig;
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