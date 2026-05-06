package com.warroom.agent.collectors.base;

import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.kernel.model.ComponentHealth;
import com.warroom.agent.kernel.supervisor.ManagedComponent;
import com.warroom.agent.transmission.LocalEventQueue;

/**
 * Classe abstraite qui factorise tout le code commun aux collecteurs.
 *
 * ══════════════════════════════════════════════════════════════
 *  POURQUOI CETTE CLASSE EXISTE
 * ══════════════════════════════════════════════════════════════
 *
 * Tous les collecteurs (LogCollector, NetworkCollector, etc.) ont
 * exactement le même squelette :
 *   - un thread dédié qui tourne en boucle ;
 *   - une référence vers la file d'attente (LocalEventQueue) ;
 *   - un booléen "running" pour savoir s'ils sont actifs ;
 *   - la même logique de start() / stop() / isRunning() / health().
 *
 * Sans cette classe, chaque collecteur devrait recopier tout ce code.
 * Avec elle, un collecteur concret n'a qu'à implémenter :
 *   - collectorName()  → son nom unique (ex: "LogCollector")
 *   - collect(config)  → sa boucle de travail (le vrai métier)
 *
 * ══════════════════════════════════════════════════════════════
 *  COMMENT LE SUPERVISOR UTILISE CETTE CLASSE
 * ══════════════════════════════════════════════════════════════
 *
 * Le Supervisor (AgentSupervisor) appelle :
 *   1. start(config)  → on crée un Thread qui appelle collect(config)
 *   2. isRunning()    → le watchdog vérifie toutes les 10 secondes
 *   3. stop()         → on met running=false et on interrompt le thread
 *   4. health()       → on construit un snapshot pour le heartbeat
 *
 * Si collect() lève une exception, le thread meurt, isRunning() retourne
 * false, et le watchdog le détecte → redémarrage automatique avec backoff.
 *
 * ══════════════════════════════════════════════════════════════
 *  LE MOT-CLÉ "ABSTRACT"
 * ══════════════════════════════════════════════════════════════
 *
 * "abstract" signifie qu'on ne peut PAS faire "new AbstractCollector()".
 * C'est un plan (un blueprint), pas un objet concret.
 * Seules les sous-classes (LogCollector, NetworkCollector...) peuvent
 * être instanciées, et elles DOIVENT fournir le code de collect().
 */
public abstract class AbstractCollector implements ManagedComponent {

    // ═══════════════════════════════════════════════════════════
    //  ATTRIBUTS COMMUNS À TOUS LES COLLECTEURS
    // ═══════════════════════════════════════════════════════════

    /**
     * La file d'attente partagée où les collecteurs déposent leurs événements.
     *
     * "protected" (et non "private") pour que les sous-classes puissent
     * y accéder directement. C'est leur outil de travail principal :
     *   eventQueue.offer(new RawEvent("linux.auth.log", line));
     *
     * "final" car la référence ne changera jamais après la construction.
     */
    protected final LocalEventQueue eventQueue;

    /**
     * Le thread dédié dans lequel le collecteur exécute sa boucle collect().
     *
     * Chaque collecteur a son propre thread. Cela permet au Supervisor
     * de les démarrer/arrêter indépendamment les uns des autres.
     *
     * "volatile" car le thread principal (Supervisor) et le thread du collecteur
     * accèdent à cette variable depuis des threads différents.
     * Sans "volatile", un thread pourrait lire une valeur périmée en cache CPU.
     */
    private volatile Thread workerThread;

    /**
     * Drapeau qui contrôle la boucle de travail du collecteur.
     *
     * Quand stop() est appelé, on passe running à false.
     * La méthode collect() de chaque sous-classe doit vérifier
     * ce drapeau à chaque itération de sa boucle :
     *   while (isRunning()) { ... }
     *
     * "volatile" pour la même raison que workerThread : visibilité inter-thread.
     */
    private volatile boolean running = false;

    /**
     * Message d'erreur de la dernière exception, si le collecteur a crashé.
     * Sera inclus dans le heartbeat pour que le serveur sache ce qui s'est passé.
     * Null si tout va bien.
     */
    private volatile String lastError = null;

    // ═══════════════════════════════════════════════════════════
    //  CONSTRUCTEUR
    // ═══════════════════════════════════════════════════════════

    /**
     * @param eventQueue la file d'attente dans laquelle ce collecteur va écrire.
     *                   Fournie par le CollectorRegistry au moment de l'instanciation.
     */
    protected AbstractCollector(LocalEventQueue eventQueue) {
        this.eventQueue = eventQueue;
    }

    // ═══════════════════════════════════════════════════════════
    //  MÉTHODES ABSTRAITES (à implémenter par chaque collecteur)
    // ═══════════════════════════════════════════════════════════

    /**
     * Retourne le nom unique du collecteur (ex: "LogCollector").
     *
     * Ce nom est utilisé :
     *   - par le Supervisor pour indexer le composant ;
     *   - dans la config serveur (champ enabledCollectors) pour l'activer/désactiver ;
     *   - dans les logs pour identifier quel collecteur parle.
     *
     * IMPORTANT : ce nom DOIT correspondre exactement à celui dans
     * enabledCollectors côté serveur (AgentConfigDto), sinon le Supervisor
     * ne démarrera pas ce collecteur.
     */
    protected abstract String collectorName();

    /**
     * La boucle de travail du collecteur. C'est ici que chaque sous-classe
     * fait son vrai métier.
     *
     * CONTRAT :
     *   - Cette méthode DOIT boucler tant que isRunning() retourne true.
     *   - À chaque itération, elle doit vérifier isRunning() pour pouvoir
     *     s'arrêter proprement quand stop() est appelé.
     *   - Si elle lève une exception, le thread meurt et le Supervisor
     *     tentera un redémarrage après un délai de backoff.
     *   - Elle doit gérer InterruptedException proprement (remettre le
     *     flag d'interruption avec Thread.currentThread().interrupt()).
     *
     * Exemple typique :
     *   while (isRunning()) {
     *       // faire le travail...
     *       Thread.sleep(1000);
     *   }
     *
     * @param config la configuration active de l'agent au moment du démarrage.
     */
    protected abstract void collect(AgentConfig config);

    // ═══════════════════════════════════════════════════════════
    //  IMPLÉMENTATION DE ManagedComponent
    // ═══════════════════════════════════════════════════════════

    /**
     * Retourne le nom du composant pour le Supervisor.
     * Délègue à collectorName() défini par chaque sous-classe.
     */
    @Override
    public final String name() {
        return collectorName();
    }

    /**
     * Démarre le collecteur dans un nouveau thread dédié.
     *
     * Appelé par le Supervisor (AgentSupervisor.tryStart()).
     *
     * POURQUOI UN THREAD SÉPARÉ ?
     * Chaque collecteur a sa propre boucle de travail qui tourne en continu
     * (ex: lire des logs, exécuter des commandes...). Si on les mettait tous
     * dans le même thread, un seul collecteur bloquerait les autres.
     *
     * LE THREAD EST "DAEMON" :
     * Un thread daemon est automatiquement tué par Java quand le programme
     * principal s'arrête. Sans ça, un collecteur bloqué empêcherait l'agent
     * de se fermer proprement.
     *
     * @param config la configuration active de l'agent.
     */
    @Override
    public final void start(AgentConfig config) {
        // Protection contre un double démarrage.
        // Si le collecteur tourne déjà, on ne fait rien.
        if (running) {
            return;
        }

        running = true;
        lastError = null;

        // Création du thread. Le nom du thread inclut le nom du collecteur
        // pour faciliter le debug (visible dans les stacktraces et dans les outils
        // comme jstack, VisualVM, IntelliJ Debugger).
        workerThread = new Thread(() -> {
            try {
                System.out.println("[" + collectorName() + "] Collecting started.");

                // Appel de la méthode abstraite : c'est ici que le collecteur
                // concret fait son travail. Cette méthode ne retourne que quand
                // isRunning() passe à false (arrêt propre) ou quand elle crashe.
                collect(config);

            } catch (Exception e) {
                // Si collect() lève une exception, on enregistre l'erreur.
                // Le thread meurt, isRunning() retournera false (car le thread
                // ne sera plus alive), et le watchdog du Supervisor détectera
                // le crash → redémarrage automatique.
                lastError = e.getMessage();
                System.err.println("[" + collectorName() + "] Crashed : " + e.getMessage());
            } finally {
                // Dans tous les cas (arrêt propre ou crash), on passe running à false.
                running = false;
                System.out.println("[" + collectorName() + "] Collecting stopped.");
            }
        }, "collector-" + collectorName());

        // Marquer comme daemon pour ne pas bloquer l'arrêt de l'agent.
        workerThread.setDaemon(true);

        // Lancement effectif du thread. À partir de ce point, collect() s'exécute
        // en parallèle du thread appelant (le Supervisor).
        workerThread.start();
    }

    /**
     * Arrête le collecteur proprement.
     *
     * Appelé par le Supervisor (AgentSupervisor.tryStop()) ou lors du
     * shutdown de l'agent.
     *
     * STRATÉGIE D'ARRÊT EN DEUX TEMPS :
     *   1. On met running=false → la boucle collect() verra ce flag
     *      à sa prochaine itération et sortira naturellement.
     *   2. On appelle workerThread.interrupt() → si le thread est bloqué
     *      dans un Thread.sleep() ou un I/O, l'interruption le réveille
     *      immédiatement au lieu d'attendre la fin du sleep.
     *
     * join(3000) attend maximum 3 secondes que le thread se termine.
     * Si après 3 secondes le thread est encore vivant, on abandonne
     * (le thread daemon sera tué à la fermeture de la JVM).
     */
    @Override
    public final void stop() {
        running = false;

        if (workerThread != null) {
            // Envoie un signal d'interruption au thread.
            // Si le thread est dans Thread.sleep(1000), il se réveille immédiatement
            // avec une InterruptedException.
            workerThread.interrupt();

            try {
                // On attend que le thread se termine, avec un timeout de 3 secondes.
                // Sans timeout, si le thread est bloqué dans un I/O qui ne répond pas
                // à l'interruption, on resterait bloqués ici indéfiniment.
                workerThread.join(3000);
            } catch (InterruptedException e) {
                // Le thread appelant (Supervisor) a lui-même été interrompu.
                // On remet le flag pour ne pas "avaler" l'interruption.
                Thread.currentThread().interrupt();
            }
        }
    }

    /**
     * Indique si le collecteur est actuellement en train de tourner.
     *
     * Le Supervisor (watchdog) appelle cette méthode toutes les 10 secondes
     * pour vérifier que le collecteur est bien vivant.
     *
     * On vérifie DEUX conditions :
     *   - running == true  → on n'a pas appelé stop()
     *   - workerThread.isAlive() → le thread Java tourne encore
     *
     * Pourquoi les deux ? Parce que si collect() lève une exception,
     * le thread meurt (isAlive()=false) mais running pourrait encore
     * être à true pendant un bref instant. Les deux conditions ensemble
     * donnent une réponse fiable.
     */
    @Override
    public final boolean isRunning() {
        return running && workerThread != null && workerThread.isAlive();
    }

    /**
     * Construit un snapshot de santé pour le heartbeat envoyé au serveur.
     *
     * Ce snapshot est inclus dans le champ componentHealth du heartbeat.
     * Le serveur (Personne B) pourra ainsi voir dans son dashboard :
     *   - le nom du collecteur
     *   - s'il tourne ou non
     *   - un message de statut (OK ou le message d'erreur du dernier crash)
     */
    @Override
    public final ComponentHealth health() {
        boolean alive = isRunning();
        String statusMessage;

        if (alive) {
            statusMessage = "running";
        } else if (lastError != null) {
            // Le collecteur a crashé et on connaît la raison.
            statusMessage = "stopped — last error: " + lastError;
        } else {
            // Le collecteur est arrêté sans erreur (soit il n'a jamais démarré,
            // soit il a été stoppé proprement par le Supervisor).
            statusMessage = "stopped";
        }

        return new ComponentHealth(collectorName(), alive, statusMessage);
    }
}