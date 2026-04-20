package com.warroom.agent.kernel.supervisor;

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

    public List<ManagedComponent> registeredComponents() {
        return new ArrayList<>();
    }
}