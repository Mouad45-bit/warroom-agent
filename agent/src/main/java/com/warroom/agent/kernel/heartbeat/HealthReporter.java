package com.warroom.agent.kernel.heartbeat;

import com.warroom.agent.kernel.model.AgentHealthSnapshot;
import com.warroom.agent.kernel.model.ComponentHealth;
import com.warroom.agent.kernel.identity.AgentStateStore;
import com.warroom.agent.kernel.supervisor.AgentSupervisor;

import java.net.InetAddress;
import java.time.Instant;
import java.util.List;

/**
 * Assemble une vue technique cohérente de l'état de l'agent.
 *
 * Ce composant ne parle pas au réseau.
 * Il lit le stateStore et le supervisor, et construit un AgentHealthSnapshot
 * qui sera sérialisé en JSON et envoyé au serveur via heartbeat.
 */
public class HealthReporter {

    private final AgentSupervisor supervisor;
    private final AgentStateStore stateStore;

    public HealthReporter(AgentSupervisor supervisor, AgentStateStore stateStore) {
        this.supervisor = supervisor;
        this.stateStore = stateStore;
    }

    public AgentHealthSnapshot build(String agentId) {
        try {
            List<ComponentHealth> componentHealth = supervisor.healthSnapshot();

            return new AgentHealthSnapshot(
                    agentId,
                    InetAddress.getLocalHost().getHostName(),
                    Instant.now(),
                    true,

                    // Transmission
                    stateStore.getQueuedEvents(),
                    stateStore.getDeliveredEvents(),
                    stateStore.getLastSuccessfulDeliveryAt(),
                    stateStore.getFailedBatches(),
                    stateStore.getDroppedEvents(),

                    // Cycle de vie
                    stateStore.getStartedAt(),
                    stateStore.getEnrollmentRetries(),

                    // Configuration
                    stateStore.getConfigRefreshFailures(),

                    // Composants
                    stateStore.getComponentRestarts(),
                    stateStore.getQuarantinedComponents(),
                    componentHealth
            );
        } catch (Exception e) {
            throw new IllegalStateException("Unable to build heartbeat snapshot", e);
        }
    }
}