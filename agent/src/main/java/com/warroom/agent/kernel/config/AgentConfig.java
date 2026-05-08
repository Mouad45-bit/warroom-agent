package com.warroom.agent.kernel.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Configuration active de l'agent.
 *
 * Pour un MVP, on garde une configuration simple :
 * - intervalle heartbeat ;
 * - taille de batch ;
 * - intervalle retry ;
 * - liste des collecteurs activés.
 *
 * Plus tard, cette classe pourra contenir
 * des sections dédiées par collecteur.
 *
 * equals() et hashCode() permettent au ConfigManager
 * de détecter les changements de configuration.
 */
public class AgentConfig {

    private int heartbeatIntervalSeconds = 30;
    private int batchSize = 100;
    private int retryIntervalSeconds = 10;
    private List<String> enabledCollectors = new ArrayList<>();

    public AgentConfig() {
    }

    public int getHeartbeatIntervalSeconds() {
        return heartbeatIntervalSeconds;
    }

    public void setHeartbeatIntervalSeconds(int heartbeatIntervalSeconds) {
        this.heartbeatIntervalSeconds = heartbeatIntervalSeconds;
    }

    public int getBatchSize() {
        return batchSize;
    }

    public void setBatchSize(int batchSize) {
        this.batchSize = batchSize;
    }

    public int getRetryIntervalSeconds() {
        return retryIntervalSeconds;
    }

    public void setRetryIntervalSeconds(int retryIntervalSeconds) {
        this.retryIntervalSeconds = retryIntervalSeconds;
    }

    public List<String> getEnabledCollectors() {
        return enabledCollectors;
    }

    public void setEnabledCollectors(List<String> enabledCollectors) {
        this.enabledCollectors = enabledCollectors;
    }

    @Override
    public String toString() {
        return "AgentConfig{" +
                "heartbeatIntervalSeconds=" + heartbeatIntervalSeconds +
                ", batchSize=" + batchSize +
                ", retryIntervalSeconds=" + retryIntervalSeconds +
                ", enabledCollectors=" + enabledCollectors +
                '}';
    }

    // ── Détection de changements ──────────────────

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AgentConfig that = (AgentConfig) o;
        return heartbeatIntervalSeconds == that.heartbeatIntervalSeconds
                && batchSize == that.batchSize
                && retryIntervalSeconds == that.retryIntervalSeconds
                && Objects.equals(enabledCollectors, that.enabledCollectors);
    }

    @Override
    public int hashCode() {
        return Objects.hash(
                heartbeatIntervalSeconds,
                batchSize,
                retryIntervalSeconds,
                enabledCollectors
        );
    }
}