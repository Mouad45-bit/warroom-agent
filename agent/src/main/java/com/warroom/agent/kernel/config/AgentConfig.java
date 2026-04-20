package com.warroom.agent.kernel.config;

import java.util.ArrayList;
import java.util.List;

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
}