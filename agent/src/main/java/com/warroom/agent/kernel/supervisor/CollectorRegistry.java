package com.warroom.agent.kernel.supervisor;

import com.warroom.agent.collectors.CommandCollector;
import com.warroom.agent.collectors.LogCollector;
import com.warroom.agent.transmission.LocalEventQueue;

import java.util.ArrayList;
import java.util.List;

/**
 * Registre des composants supervisés.
 *
 * Pour l'instant :
 * - il n'y a pas encore de collecteur réel ;
 * - on prépare simplement le point d'extension.
 *
 * Plus tard, on pourra ajouter ici :
 * - new LogCollector(...)
 * - new SyscallCollector(...)
 * - new CommandCollector(...)
 */
public class CollectorRegistry {

    private final LocalEventQueue eventQueue;

    public CollectorRegistry(LocalEventQueue eventQueue) {
        this.eventQueue = eventQueue;
    }

    public List<ManagedComponent> registeredComponents() {
        List<ManagedComponent> components = new ArrayList<>();

        // Plus tard, ton collaborateur fera :
        components.add(new CommandCollector(eventQueue));
        components.add(new LogCollector(eventQueue));

        return components;
    }
}