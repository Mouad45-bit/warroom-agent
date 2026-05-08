package com.warroom.agent.kernel.identity;

import java.time.Instant;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Contient l'état runtime de l'agent.
 *
 * Stockage mémoire thread-safe exposé via le heartbeat.
 * Tous les compteurs sont additifs (on n'efface pas l'historique
 * entre les heartbeats — le serveur peut calculer les deltas).
 *
 * Compteurs existants :
 *   queuedEvents, deliveredEvents,
 *   lastSuccessfulDeliveryAt, startedAt, lastKnownIdentity
 *
 * Ajouts :
 *   enrollmentRetries, configRefreshFailures, componentRestarts,
 *   quarantinedComponents, failedBatches, droppedEvents.
 */
// Cette classe agit comme le "Tableau de bord" en mémoire vive de l'agent.
// Comme plusieurs sous-systèmes (le batcher, le heartbeat, le superviseur) s'exécutent
// dans des threads séparés et vont modifier ces valeurs en même temps, il est VITAL
// que toutes les variables soient "Thread-Safe" pour éviter des corruptions de données.
public class AgentStateStore {

    // ── Compteurs ──────────────────────────────────────────

    // L'utilisation de "AtomicLong" au lieu d'un simple "long" est la clé ici.
    // AtomicLong garantit que si deux threads essaient de faire "+1" exactement à la même milliseconde,
    // les deux additions seront prises en compte correctement sans qu'une n'écrase l'autre.

    // Nombre total d'événements mis en file d'attente depuis le démarrage.
    private final AtomicLong queuedEvents = new AtomicLong(0);

    // Nombre total d'événements expédiés avec succès au serveur.
    private final AtomicLong deliveredEvents = new AtomicLong(0);

    // L'utilisation de "AtomicReference" sert à stocker des objets (ici la date/heure 'Instant')
    // de manière sécurisée en multi-threading.
    private final AtomicReference<Instant> lastSuccessfulDeliveryAt = new AtomicReference<>(null);
    private final AtomicReference<Instant> startedAt = new AtomicReference<>(null);

    // Garde en mémoire l'ID de l'agent (pratique si l'agent perd sa connexion au fichier sur le disque).
    private final AtomicReference<String> lastKnownIdentity = new AtomicReference<>(null);

    /** Nombre de tentatives d'enrollment. */
    // Indique combien de fois l'agent a dû lutter pour s'enrôler (utile pour diagnostiquer des problèmes réseau au boot).
    private final AtomicLong enrollmentRetries = new AtomicLong(0);

    /** Nombre d'échecs de refresh de configuration. */
    // Permet de savoir si le serveur de configuration est instable.
    private final AtomicLong configRefreshFailures = new AtomicLong(0);

    /** Nombre total de redémarrages de composants par le supervisor. */
    // Métrique cruciale : si ce chiffre grimpe vite, cela veut dire qu'un collecteur n'arrête pas de crasher.
    private final AtomicLong componentRestarts = new AtomicLong(0);

    /**
     * Noms des composants actuellement en quarantaine.
     *
     * ConcurrentHashMap.newKeySet() donne un Set thread-safe.
     * On ajoute quand un composant passe QUARANTINED,
     * on retire si le statut change (hot-reload ou redémarrage agent).
     */
    // Un HashSet classique planterait si le Superviseur y ajoute un composant au moment
    // exact où le Heartbeat essaie de le lire. ConcurrentHashMap.newKeySet() règle ce problème
    // en fournissant une liste (Set) optimisée pour les accès concurrents.
    private final Set<String> quarantinedComponents = ConcurrentHashMap.newKeySet();

    /** Nombre de batches d'événements non envoyés au serveur. */
    private final AtomicLong failedBatches = new AtomicLong(0);

    /** Nombre d'événements rejetés car la queue était pleine. */
    // Métrique de "Backpressure" : si ce chiffre augmente, la file d'attente est trop petite
    // ou le réseau est trop lent pour évacuer les événements générés.
    private final AtomicLong droppedEvents = new AtomicLong(0);

    // ── Getters ────────────────────────────────────────────

    // Ces méthodes sont principalement appelées par le composant "HealthReporter"
    // lorsqu'il compile le bilan de santé pour l'envoyer via le Heartbeat.

    public long getQueuedEvents() { return queuedEvents.get(); }
    public long getDeliveredEvents() { return deliveredEvents.get(); }
    public Instant getLastSuccessfulDeliveryAt() { return lastSuccessfulDeliveryAt.get(); }
    public Instant getStartedAt() { return startedAt.get(); }
    public String getLastKnownIdentity() { return lastKnownIdentity.get(); }
    public long getEnrollmentRetries() { return enrollmentRetries.get(); }
    public long getConfigRefreshFailures() { return configRefreshFailures.get(); }
    public long getComponentRestarts() { return componentRestarts.get(); }

    // Collections.unmodifiableSet(...) est une protection architecturale.
    // Cela donne une vue "lecture seule" de la liste. Ainsi, le composant qui appelle
    // ce getter ne pourra pas modifier la liste par erreur (ça lèverait une exception).
    // Seules les méthodes de AgentStateStore ont le droit de modifier le Set.
    public Set<String> getQuarantinedComponents() { return Collections.unmodifiableSet(quarantinedComponents); }

    public long getFailedBatches() { return failedBatches.get(); }
    public long getDroppedEvents() { return droppedEvents.get(); }

    // ── Setters ──────────────────────────────

    // Ces méthodes sont exposées aux différents "Managers" et "Services" de l'agent
    // pour qu'ils puissent y déclarer leur activité.

    // .addAndGet() ajoute la valeur (delta) et s'assure que l'opération est atomique (inséparable).
    public void incrementQueuedEvents(long delta) { queuedEvents.addAndGet(delta); }
    public void incrementDeliveredEvents(long delta) { deliveredEvents.addAndGet(delta); }

    // .set() écrase l'ancienne valeur par la nouvelle de manière sûre.
    public void markLastSuccessfulDeliveryAt(Instant instant) { lastSuccessfulDeliveryAt.set(instant); }
    public void markAgentStartedAt(Instant instant) { startedAt.set(instant); }
    public void markLastKnownIdentity(String agentId) { lastKnownIdentity.set(agentId); }

    /** Appelé par RetryExecutor / AgentBootstrap* à chaque tentative d'enrollment. */
    // .incrementAndGet() est l'équivalent thread-safe de "compteur++".
    public void incrementEnrollmentRetries() { enrollmentRetries.incrementAndGet(); }

    /** Appelé par ConfigRefreshScheduler quand refreshSafely() échoue. */
    public void incrementConfigRefreshFailures() { configRefreshFailures.incrementAndGet(); }

    /** Appelé par AgentSupervisor.tryStart() après un redémarrage de composant. */
    public void incrementComponentRestarts() { componentRestarts.incrementAndGet(); }

    /** Appelé par AgentSupervisor quand un composant passe en QUARANTINED. */
    // Le superviseur l'appelle si un collecteur a crashé trop de fois (ex: 5 fois de suite).
    public void markComponentQuarantined(String componentName) {
        quarantinedComponents.add(componentName);
    }

    /** Appelé par AgentSupervisor quand un composant sort de quarantaine (hot-reload). */
    // Si l'administrateur système force un redémarrage ou envoie une nouvelle configuration
    // depuis le serveur, le composant a droit à une seconde chance et est retiré de la quarantaine.
    public void markComponentUnquarantined(String componentName) {
        quarantinedComponents.remove(componentName);
    }

    /** Appelé par EventBatcher quand un HTTP POST d'événements échoue. */
    public void incrementFailedBatches() { failedBatches.incrementAndGet(); }

    /** Appelé par LocalEventQueue quand offer() rejette un événement (queue pleine). */
    public void incrementDroppedEvents() { droppedEvents.incrementAndGet(); }
}