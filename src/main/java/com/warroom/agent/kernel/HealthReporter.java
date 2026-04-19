package com.warroom.agent.kernel;

import java.net.InetAddress;
import java.time.Instant;
import java.util.List;

/**
 * Assemble une vue technique cohérente de l'état de l'agent.
 *
 * Ce composant ne parle pas au réseau.
 * Il construit uniquement un objet "AgentHealthSnapshot".
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
                    stateStore.getQueuedEvents(),
                    stateStore.getDeliveredEvents(),
                    stateStore.getLastSuccessfulDeliveryAt(),
                    stateStore.getStartedAt(),
                    componentHealth
            );
        } catch (Exception e) {
            throw new IllegalStateException("Unable to build heartbeat snapshot", e);
        }
    }
}