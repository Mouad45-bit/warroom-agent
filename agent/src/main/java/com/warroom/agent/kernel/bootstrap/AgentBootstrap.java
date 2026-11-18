package com.warroom.agent.kernel.bootstrap;

import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.kernel.config.AgentConfigManager;
import com.warroom.agent.kernel.enrollment.AgentEnrollmentClient;
import com.warroom.agent.kernel.heartbeat.HeartbeatService;
import com.warroom.agent.kernel.identity.AgentAuthStore;
import com.warroom.agent.kernel.identity.AgentStateStore;
import com.warroom.agent.kernel.model.AgentIdentity;
import com.warroom.agent.kernel.resilience.RetryExecutor;
import com.warroom.agent.kernel.resilience.RetryPolicy;
import com.warroom.agent.kernel.supervisor.AgentSupervisor;
import com.warroom.agent.transmission.EventBatcher;

import java.net.InetAddress;
import java.time.Instant;
import java.util.Optional;

/**
 * Coordonne la séquence complète de démarrage de l'agent.
 *
 * Stratégie de résilience :
 * - Phase 1 : résoudre l'identité (disque → enrollment avec retry) ;
 * - Phase 2 : charger la configuration (remote → cache → défaut) ;
 * - Phase 3 : démarrer les composants (toujours, même sans identité) ;
 * - Phase 4 : si pas d'identité, lancer un enrollment en arrière-plan.
 *
 * L'agent ne crashe jamais au boot.
 * Le heartbeat et le batcher vérifient l'identité à chaque tick,
 * donc dès qu'elle apparaît, tout s'active automatiquement.
 */
public class AgentBootstrap {

    // =========================================================================
    // DÉPENDANCES DU NOYAU
    // =========================================================================
    private final AgentAuthStore authStore;               // Gère la lecture/écriture de l'identité sur le disque
    private final AgentEnrollmentClient enrollmentClient; // Gère les requêtes HTTP vers le serveur backend
    private final AgentConfigManager configManager;       // Gère le rechargement et le cache de la configuration
    private final AgentSupervisor supervisor;             // Gère l'allumage et la surveillance des collecteurs
    private final HeartbeatService heartbeatService;      // Envoie les pings de santé au serveur
    private final AgentStateStore stateStore;             // La mémoire vive contenant tous les compteurs (métriques)
    private final EventBatcher batcher;                   // Récupère les alertes, les emballe et les expédie

    // Le mot-clé "volatile" est crucial ici : il garantit que si un thread modifie
    // cette variable, la nouvelle valeur sera immédiatement visible par tous les autres threads.
    // Cela empêche un bug où deux threads essaieraient de démarrer l'agent en même temps.
    private volatile boolean started = false;

    /** Thread daemon pour l'enrollment en arrière-plan. */
    // "volatile" pour la même raison : s'assurer que le thread principal voit bien
    // l'état de ce thread secondaire lors de l'arrêt (stop).
    private volatile Thread backgroundEnrollmentThread;

    // Le constructeur applique le pattern d'Injection de Dépendances.
    // Le Bootstrap ne crée aucun objet lui-même, il reçoit tout ce dont il a besoin
    // de la part de AgentApplication.
    public AgentBootstrap(
            AgentAuthStore authStore,
            AgentEnrollmentClient enrollmentClient,
            AgentConfigManager configManager,
            AgentSupervisor supervisor,
            HeartbeatService heartbeatService,
            AgentStateStore stateStore,
            EventBatcher batcher
    ) {
        this.authStore = authStore;
        this.enrollmentClient = enrollmentClient;
        this.configManager = configManager;
        this.supervisor = supervisor;
        this.heartbeatService = heartbeatService;
        this.stateStore = stateStore;
        this.batcher = batcher;
    }

    /**
     * Lance toute la séquence de démarrage.
     * Ne lève jamais d'exception — l'agent démarre toujours,
     * en mode normal ou dégradé.
     */
    // "synchronized" agit comme un verrou (lock). Un seul thread à la fois peut exécuter
    // cette méthode. Cela protège la variable "started" contre les accès concurrents.
    public synchronized void start() {
        if (started) {
            System.out.println("[AgentBootstrap] Agent already started.");
            return;
        }

        // Enregistre l'heure de démarrage exacte pour l'afficher plus tard dans les métriques
        stateStore.markAgentStartedAt(Instant.now());

        // ── Phase 1 : résolution de l'identité ──────────────────────────
        // L'agent cherche à savoir qui il est. Soit il lit son fichier local,
        // soit il fait quelques tentatives rapides vers le serveur.
        AgentIdentity identity = resolveIdentity();

        if (identity != null) {
            // S'il trouve son identité, on met à jour la mémoire de l'agent.
            stateStore.markLastKnownIdentity(identity.agentId());
            System.out.println("[AgentBootstrap] Identity ready. agentId=" + identity.agentId());
        } else {
            // S'il n'a pas d'identité (ex: pas d'internet), il ne crashe pas !
            // Il continue son démarrage en mode "dégradé".
            System.out.println("[AgentBootstrap] No identity available. Starting in degraded mode.");
        }

        // ── Phase 2 : configuration ─────────────────────────────────────
        // Charge la configuration (via réseau si identité dispo, sinon via cache local ou défaut)
        AgentConfig config = configManager.refreshConfig();
        System.out.println("[AgentBootstrap] Active configuration loaded : " + config);

        // ── Phase 3 : démarrer tous les composants ──────────────────────
        // Même en mode dégradé (sans identité), on lance les "ouvriers".
        // Les événements vont juste s'accumuler dans la file d'attente locale (LocalEventQueue)
        // et le Heartbeat tournera à vide jusqu'à ce que l'identité apparaisse.
        supervisor.startAll(config);
        batcher.start();
        heartbeatService.start();

        started = true; // L'agent est officiellement en route

        // ── Phase 4 : enrollment background si nécessaire ───────────────
        // Si la Phase 1 a échoué (mode dégradé), on lance la tâche de fond
        // qui va harceler le serveur doucement jusqu'à ce que le réseau revienne.
        if (identity == null) {
            startBackgroundEnrollment();
        }

        System.out.println("[AgentBootstrap] Agent started successfully"
                + (identity == null ? " (degraded mode — enrollment pending)." : "."));
    }

    /**
     * Arrêt propre de l'agent.
     */
    // Méthode appelée par le ShutdownHook de l'OS (ex: lors d'un Ctrl+C).
    // "synchronized" évite qu'on puisse appeler stop() pendant qu'un start() est en cours.
    public synchronized void stop() {
        // 1. On coupe d'abord le thread d'arrière-plan s'il tournait.
        stopBackgroundEnrollment();

        // 2. On arrête chaque sous-système dans des blocs try-catch séparés.
        // C'est vital : si le Heartbeat crashe en s'arrêtant, on veut quand même
        // que le Batcher et le Supervisor aient la chance de s'arrêter proprement.
        try {
            heartbeatService.stop();
        } catch (Exception e) {
            System.err.println("[AgentBootstrap] Heartbeat stop error : " + e.getMessage());
        }

        try {
            batcher.stop();
        } catch (Exception e) {
            System.err.println("[AgentBootstrap] Batcher stop error : " + e.getMessage());
        }

        try {
            supervisor.stopAll();
        } catch (Exception e) {
            System.err.println("[AgentBootstrap] Component shutdown error : " + e.getMessage());
        }

        started = false; // L'agent est officiellement éteint
        System.out.println("[AgentBootstrap] Agent shutdown.");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Méthodes internes
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Tente de résoudre l'identité de l'agent.
     *
     * Priorité :
     * 1. identité locale (disque) ;
     * 2. enrollment au serveur avec retry rapide (RetryPolicy.boot()) ;
     * 3. null → l'agent démarre en mode dégradé.
     */
    private AgentIdentity resolveIdentity() {
        // 1. Tentative de chargement depuis le disque (rapide et pas besoin de réseau).
        AgentIdentity existing = authStore.loadIdentity().orElse(null);
        if (existing != null) {
            System.out.println("[AgentBootstrap] Existing identity loaded. agentId=" + existing.agentId());
            return existing;
        }

        System.out.println("[AgentBootstrap] No local identity. Attempting enrollment...");

        // 2. Si pas de fichier sur le disque, on appelle le serveur.
        // Utilise RetryPolicy.boot() : l'agent essaie 5 fois avec des pauses courtes (1s, 2s, 4s...).
        // "this::performEnrollment" passe la méthode ci-dessous comme un bloc de code à exécuter.
        return RetryExecutor.execute(
                this::performEnrollment,
                RetryPolicy.boot(),
                "enrollment"
        ).orElse(null); // Si après 5 essais ça rate, on renvoie null au lieu de planter.
    }

    /**
     * Exécute un enrollment et persiste l'identité.
     * Appelé aussi bien par le boot que par le thread background.
     */
    private AgentIdentity performEnrollment() {
        try {
            // Récupération des informations dynamiques de la machine hôte
            String hostname = InetAddress.getLocalHost().getHostName();
            String osName = System.getProperty("os.name");
            String osVersion = System.getProperty("os.version");
            String agentVersion = "0.1.0";

            // Requête HTTP vers le serveur via le client réseau
            AgentIdentity identity = enrollmentClient.enroll(
                    hostname, osName, osVersion, agentVersion
            );

            // Succès ! On sauvegarde tout de suite dans "identity.json" pour les prochains redémarrages
            authStore.saveIdentity(identity);
            return identity;
        } catch (Exception e) {
            // Transforme l'erreur (ex: serveur injoignable) en IllegalStateException.
            // Cette exception sera interceptée par le RetryExecutor qui déclenchera une nouvelle tentative.
            throw new IllegalStateException("[AgentBootstrap] Enrollment failed : " + e.getMessage(), e);
        }
    }

    /**
     * Lance un thread daemon qui retente l'enrollment
     * via RetryExecutor avec la politique background (5s → 60s, infini).
     *
     * Dès que l'enrollment réussit :
     * - l'identité est sauvée sur disque ;
     * - le heartbeat et le batcher la trouvent au prochain tick ;
     * - la config est rafraîchie ;
     * - le thread meurt naturellement.
     */
    private void startBackgroundEnrollment() {
        // Création d'un thread secondaire dédié uniquement à cette tâche pour ne pas geler le programme principal
        backgroundEnrollmentThread = new Thread(() -> {

            // Cette exécution va tourner en boucle potentiellement à l'infini grâce à RetryPolicy.background()
            // (qui fait des pauses de 5s, 10s... jusqu'à 60s entre chaque essai).
            Optional<AgentIdentity> result = RetryExecutor.execute(
                    this::performEnrollment,
                    RetryPolicy.background(),
                    "background-enrollment"
            );

            // Dès que la boucle ci-dessus réussit (le réseau est revenu), on entre dans ce bloc "ifPresent"
            result.ifPresent(identity -> {
                // On notifie la mémoire interne que l'agent a désormais une identité
                stateStore.markLastKnownIdentity(identity.agentId());

                // On met à jour la configuration (qui peut maintenant utiliser la clé API pour contacter le backend)
                configManager.refreshConfig();

                System.out.println("[BackgroundEnrollment] Enrollment succeeded ! agentId="
                        + identity.agentId() + ". Agent is now fully operational.");
            });

            // Fin du code du Thread. N'ayant plus d'instructions à exécuter ni de boucle infinie (while true),
            // le thread s'arrête proprement et la mémoire est libérée par le Garbage Collector de Java.
        }, "agent-background-enrollment"); // Nom du thread pour faciliter le debuggage (ex: dans JConsole)

        // Un thread "daemon" est un thread non bloquant. Si le programme principal s'arrête,
        // la JVM (machine Java) tuera ce thread immédiatement sans attendre qu'il finisse.
        backgroundEnrollmentThread.setDaemon(true);
        backgroundEnrollmentThread.start(); // Lance l'exécution du bloc de code ci-dessus

        System.out.println("[BackgroundEnrollment] Background enrollment started.");
    }

    // Arrête le thread d'enrôlement s'il est en cours (utilisé par la méthode stop() globale)
    private void stopBackgroundEnrollment() {
        // On vérifie que la variable n'est pas nulle et que le thread tourne encore
        if (backgroundEnrollmentThread != null && backgroundEnrollmentThread.isAlive()) {

            // interrupt() ne "tue" pas le thread de force (ce qui serait dangereux pour la mémoire).
            // Il envoie un signal au thread. Si le thread est en train de "dormir" (Thread.sleep)
            // dans le RetryExecutor, cela déclenchera une InterruptedException qui le fera sortir de sa boucle.
            backgroundEnrollmentThread.interrupt();
            System.out.println("[BackgroundEnrollment] Background enrollment stopped.");
        }
    }
}