package com.warroom.agent.kernel.supervisor;

import com.warroom.agent.collectors.file.FileIntegrityCollector;
import com.warroom.agent.collectors.log.LogCollector;
import com.warroom.agent.collectors.network.NetworkCollector;
import com.warroom.agent.collectors.process.ProcessCollector;
import com.warroom.agent.transmission.LocalEventQueue;

import java.util.ArrayList;
import java.util.List;

/**
 * Registre des composants supervisés — le catalogue complet des collecteurs.
 *
 * ══════════════════════════════════════════════════════════════
 *  RÔLE : LE CATALOGUE DES COLLECTEURS
 * ══════════════════════════════════════════════════════════════
 *
 * Cette classe recense tous les collecteurs disponibles dans l'agent.
 * Le Supervisor ne connaît pas les collecteurs directement — il reçoit
 * une liste de ManagedComponent via cette classe.
 *
 * IMPORTANT : être dans ce catalogue ne signifie PAS que le collecteur
 * sera démarré. Le Supervisor ne démarre que ceux dont le nom apparaît
 * dans enabledCollectors de la config serveur. Les autres sont DISABLED.
 *
 * ══════════════════════════════════════════════════════════════
 *  LES 4 COLLECTEURS ET LEUR COMPLÉMENTARITÉ
 * ══════════════════════════════════════════════════════════════
 *
 *   LogCollector           → QUI s'authentifie ? (auth.log, syslog, kern.log)
 *   NetworkCollector       → QUI communique ? (connexions réseau actives)
 *   ProcessCollector       → QUI s'exécute ? (liste des processus)
 *   FileIntegrityCollector → QUOI a changé ? (hashes de fichiers critiques)
 *
 *   Les 4 collecteurs sont des "filets de sécurité" :
 *   ils capturent des snapshots périodiques.
 *
 * ══════════════════════════════════════════════════════════════
 *  COMMENT AJOUTER UN NOUVEAU COLLECTEUR
 * ══════════════════════════════════════════════════════════════
 *
 *   1. Créer la classe qui extends AbstractCollector
 *   2. Ajouter une ligne ici : components.add(new MonCollector(eventQueue));
 *   3. Côté serveur (Personne B), ajouter le nom dans enabledCollectors
 */
public class CollectorRegistry {

    private final LocalEventQueue eventQueue;

    public CollectorRegistry(LocalEventQueue eventQueue) {
        this.eventQueue = eventQueue;
    }

    /**
     * Retourne la liste de TOUS les collecteurs disponibles.
     *
     * Appelé une seule fois, au boot de l'agent, par AgentApplication.
     * Chaque collecteur reçoit la même eventQueue et y déposera
     * ses RawEvent indépendamment, chacun depuis son propre thread.
     */
    public List<ManagedComponent> registeredComponents() {
        List<ManagedComponent> components = new ArrayList<>();

        // ── Priorité 1 : Surveillance des logs système ──────────
        components.add(new LogCollector(eventQueue));

        // ── Priorité 2 : Cartographie réseau ────────────────────
        components.add(new NetworkCollector(eventQueue));

        // ── Priorité 3 : Inventaire des processus ───────────────
        components.add(new ProcessCollector(eventQueue));

        // ── Priorité 4 : Intégrité des fichiers critiques ──────
        // Surveille : fichiers système + cron + authorized_keys
        components.add(new FileIntegrityCollector(eventQueue));

        return components;
    }
}