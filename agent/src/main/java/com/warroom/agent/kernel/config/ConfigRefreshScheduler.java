package com.warroom.agent.kernel.config;

import com.warroom.agent.kernel.identity.AgentStateStore;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Interroge périodiquement le serveur pour recharger la configuration.
 *
 * Rôle architectural :
 * L'agent fonctionne sur un modèle "Pull" (il tire l'information). Le serveur ne
 * pousse pas la configuration vers l'agent ; c'est l'agent qui, grâce à cette classe,
 * demande régulièrement au serveur "As-tu une nouvelle configuration pour moi ?".
 *
 * Modification :
 * - reçoit un AgentStateStore pour compter les échecs de refresh
 *   (configRefreshFailures).
 */
public class ConfigRefreshScheduler {

    // =========================================================================
    // PARAMÈTRES ET ÉTAT INTERNE
    // =========================================================================

    // Intervalle de temps entre chaque requête au serveur.
    // Fixé à 60 secondes : c'est un bon compromis pour ne pas spammer le serveur,
    // tout en appliquant les changements de configuration assez rapidement.
    private static final int REFRESH_INTERVAL_SECONDS = 60;

    // Le composant qui sait comment faire la requête HTTP et appliquer la config.
    private final AgentConfigManager configManager;

    // La mémoire des métriques de l'agent (pour noter si le serveur ne répond pas).
    private final AgentStateStore stateStore;

    // L'outil Java qui permet de planifier des tâches répétitives dans le temps.
    private ScheduledExecutorService scheduler;

    // Le flag d'état. "volatile" garantit que si le thread principal met "running"
    // à true, tous les autres threads du système verront cette modification
    // immédiatement. Cela évite les bugs de synchronisation en mémoire cache.
    private volatile boolean running = false;

    // Injection de dépendances via le constructeur.
    public ConfigRefreshScheduler(AgentConfigManager configManager, AgentStateStore stateStore) {
        this.configManager = configManager;
        this.stateStore = stateStore;
    }

    // =========================================================================
    // GESTION DU CYCLE DE VIE (START / STOP)
    // =========================================================================

    /**
     * Lance le planificateur de requêtes.
     * "synchronized" empêche l'exécution simultanée de cette méthode par deux threads différents.
     */
    public synchronized void start() {
        // Sécurité : si le planificateur tourne déjà, on ne fait rien.
        if (running) return;

        // On crée un "pool" contenant un seul thread dédié à cette tâche.
        // On utilise une expression lambda (r -> { ... }) pour personnaliser ce thread.
        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {

            // On donne un nom explicite au thread.
            // C'est extrêmement utile pour le débogage (si on lit les logs ou utilise un outil comme JConsole).
            Thread t = new Thread(r, "agent-config-refresh");

            // setDaemon(true) : Indique que ce thread est un travailleur de l'ombre.
            // Si l'application principale s'arrête, la machine Java (JVM) n'attendra pas
            // que ce thread finisse son travail, elle le coupera instantanément.
            t.setDaemon(true);
            return t;
        });

        // Planifie la tâche pour qu'elle s'exécute en boucle.
        scheduler.scheduleWithFixedDelay(
                this::refreshSafely,      // La méthode à exécuter
                REFRESH_INTERVAL_SECONDS, // Délai avant la TOUTE PREMIÈRE exécution (60s)
                REFRESH_INTERVAL_SECONDS, // Délai d'attente ENTRE la fin d'une exécution et le début de la suivante (60s)
                TimeUnit.SECONDS          // L'unité de temps utilisée pour les nombres au-dessus
        );

        running = true;
        System.out.println("[ConfigRefresh] Scheduler started. interval=" + REFRESH_INTERVAL_SECONDS + "s");
    }

    /**
     * Arrête le planificateur.
     * Appelé généralement lors de l'arrêt complet de l'agent.
     */
    public synchronized void stop() {
        if (!running) return;

        // shutdownNow() ordonne l'arrêt immédiat du thread.
        // S'il était en train d'attendre (sleep) ou de faire une requête HTTP,
        // cela va déclencher une interruption pour forcer l'arrêt.
        scheduler.shutdownNow();
        running = false;
        System.out.println("[ConfigRefresh] Scheduler stopped.");
    }

    // =========================================================================
    // LA LOGIQUE MÉTIER
    // =========================================================================

    /**
     * La méthode exécutée toutes les 60 secondes.
     *
     * Il est VITAL d'avoir un bloc "try-catch" ici. Dans un ScheduledExecutorService,
     * si une tâche lève une exception (erreur) qui n'est pas attrapée,
     * le planificateur "meurt" silencieusement et la tâche ne s'exécutera plus jamais.
     */
    private void refreshSafely() {
        try {
            // Tente de récupérer la configuration (fait un appel HTTP via le ConfigManager).
            configManager.refreshConfig();
        } catch (Exception e) {
            // Si ça échoue (ex: perte de connexion internet, serveur indisponible) :
            // 1. L'exception est attrapée, donc le scheduler (la boucle) continue de vivre.
            // 2. On note l'échec dans le StateStore pour que le prochain Heartbeat informe
            //    le serveur que cet agent rencontre des problèmes réseau.
            stateStore.incrementConfigRefreshFailures();

            // 3. On log l'erreur pour le développeur/administrateur local.
            System.err.println("[ConfigRefresh] Refresh failed : " + e.getMessage());
        }
    }
}