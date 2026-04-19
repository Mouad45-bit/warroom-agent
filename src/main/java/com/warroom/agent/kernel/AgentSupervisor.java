package com.warroom.agent.kernel;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Démarre, arrête et surveille les composants gérés par l'agent.
 *
 * Pour le MVP :
 * - on démarre les composants ;
 * - on les arrête ;
 * - on expose leur état santé.
 *
 * Plus tard, on pourra ajouter :
 * - restart automatique si crash ;
 * - backoff ;
 * - quarantine d'un composant instable.
 */
public class AgentSupervisor {

    private final List<ManagedComponent> components;

    public AgentSupervisor(List<ManagedComponent> components) {
        this.components = new ArrayList<>(components);
    }

    public synchronized void startAll(AgentConfig config) {
        for (ManagedComponent component : components) {
            try {
                component.start(config);
                System.out.println("[Supervisor] Component started : " + component.name());
            } catch (Exception e) {
                System.err.println("[Supervisor] Component startup failure " + component.name() + ": " + e.getMessage());
            }
        }
    }

    public synchronized void stopAll() {
        for (ManagedComponent component : components) {
            try {
                component.stop();
                System.out.println("[Supervisor] Component stopped : " + component.name());
            } catch (Exception e) {
                System.err.println("[Supervisor] Component shutdown failed " + component.name() + ": " + e.getMessage());
            }
        }
    }

    public List<ComponentHealth> healthSnapshot() {
        List<ComponentHealth> result = new ArrayList<>();
        for (ManagedComponent component : components) {
            try {
                result.add(component.health());
            } catch (Exception e) {
                result.add(new ComponentHealth(component.name(), false, "Health check failed: " + e.getMessage()));
            }
        }
        return Collections.unmodifiableList(result);
    }
}