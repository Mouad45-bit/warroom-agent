package com.warroom.agent.collectors.log;

import com.warroom.agent.collectors.base.AbstractCollector;
import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.transmission.LocalEventQueue;
import com.warroom.agent.transmission.model.RawEvent;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Collecteur de logs système — LE collecteur le plus important du SOC.
 *
 * ══════════════════════════════════════════════════════════════
 *  RÔLE DANS L'ARCHITECTURE
 * ══════════════════════════════════════════════════════════════
 *
 * Ce collecteur surveille les fichiers de log du système Linux
 * (auth.log, syslog, kern.log...) et transmet chaque nouvelle
 * ligne au serveur pour analyse.
 *
 * C'est grâce à ces logs que le serveur (Personne B) pourra
 * détecter des attaques comme :
 *   - des tentatives de brute-force SSH ("Failed password for root...")
 *   - des connexions root suspectes ("Accepted password for root...")
 *   - des utilisateurs inconnus ("Invalid user...")
 *   - des escalades de privilèges via sudo
 *
 * ══════════════════════════════════════════════════════════════
 *  COMMENT ÇA MARCHE
 * ══════════════════════════════════════════════════════════════
 *
 *   1. Au démarrage, on crée un LogTailer par fichier à surveiller.
 *      Chaque LogTailer se positionne à la FIN du fichier
 *      (on ne relit pas l'historique).
 *
 *   2. Toutes les secondes (POLL_INTERVAL_MS), on demande à
 *      chaque LogTailer : "y a-t-il de nouvelles lignes ?"
 *
 *   3. Pour chaque nouvelle ligne trouvée, on crée un RawEvent
 *      avec le sourceType correspondant au fichier (ex: "linux.auth.log")
 *      et on le pousse dans la LocalEventQueue.
 *
 *   4. L'EventBatcher récupérera ces RawEvent, les emballera
 *      en EnvelopedEvent, et les enverra au serveur par HTTP.
 *
 * ══════════════════════════════════════════════════════════════
 *  FICHIERS SURVEILLÉS ET SOURCEYPES (CONTRAT AVEC LE SERVEUR)
 * ══════════════════════════════════════════════════════════════
 *
 *   Fichier                    sourceType
 *   ─────────────────────────  ────────────────
 *   /var/log/auth.log          linux.auth.log
 *   /var/log/syslog            linux.syslog
 *   /var/log/kern.log          linux.kern.log
 *
 * Ces valeurs de sourceType font partie du CONTRAT PARTAGÉ avec
 * Personne B. Le serveur les utilise pour router les événements
 * vers le bon Analyzer. Toute modification doit être synchronisée.
 *
 * ══════════════════════════════════════════════════════════════
 *  HÉRITAGE : ABSTRACTCOLLECTOR
 * ══════════════════════════════════════════════════════════════
 *
 * Cette classe hérite d'AbstractCollector qui gère :
 *   - le thread de travail (création, démarrage, arrêt)
 *   - le booléen "running"
 *   - le contrat ManagedComponent (start/stop/isRunning/health)
 *
 * Nous n'avons qu'à implémenter :
 *   - collectorName() → "LogCollector"
 *   - collect(config) → la boucle de surveillance des fichiers
 */
public class LogCollector extends AbstractCollector {

    // ═══════════════════════════════════════════════════════════
    //  CONSTANTES
    // ═══════════════════════════════════════════════════════════

    /**
     * Le nom unique de ce collecteur.
     *
     * DOIT correspondre exactement au nom dans enabledCollectors
     * côté serveur. Si le serveur envoie enabledCollectors=["LogCollector"],
     * le Supervisor cherchera un composant dont name() retourne "LogCollector".
     */
    private static final String NAME = "LogCollector";

    /**
     * Intervalle de vérification en millisecondes.
     *
     * Toutes les 1000ms (1 seconde), on vérifie si de nouvelles
     * lignes sont apparues dans les fichiers surveillés.
     *
     * Compromis :
     *   - Trop court (100ms) → gaspillage CPU pour rien
     *   - Trop long (10s) → on rate des événements critiques
     *   - 1 seconde est un bon compromis pour un SOC
     *
     * Plus tard, cette valeur pourra venir de collectorConfigs
     * dans la config serveur.
     */
    private static final long POLL_INTERVAL_MS = 1000;

    // ═══════════════════════════════════════════════════════════
    //  ATTRIBUTS
    // ═══════════════════════════════════════════════════════════

    /**
     * La liste des LogTailer, un par fichier surveillé.
     *
     * Créée dans collect() au moment du démarrage.
     * Chaque LogTailer garde en mémoire son curseur (offset) dans le fichier.
     */
    private final List<LogTailer> tailers = new ArrayList<>();

    // ═══════════════════════════════════════════════════════════
    //  CONSTRUCTEUR
    // ═══════════════════════════════════════════════════════════

    /**
     * @param eventQueue la file d'attente où déposer les événements.
     *                   Fournie par le CollectorRegistry.
     */
    public LogCollector(LocalEventQueue eventQueue) {
        // Appel du constructeur de la classe parent (AbstractCollector).
        // "super" fait référence au constructeur d'AbstractCollector
        // qui stocke la référence vers eventQueue.
        super(eventQueue);
    }

    // ═══════════════════════════════════════════════════════════
    //  IMPLÉMENTATION DES MÉTHODES ABSTRAITES
    // ═══════════════════════════════════════════════════════════

    @Override
    protected String collectorName() {
        return NAME;
    }

    /**
     * Boucle principale du collecteur de logs.
     *
     * Cette méthode est appelée par AbstractCollector.start() dans un
     * thread dédié. Elle ne retourne que quand :
     *   - isRunning() passe à false (arrêt propre via stop())
     *   - une exception non récupérée est levée (crash → redémarrage)
     *
     * @param config la configuration active. Utilisée ici pour savoir
     *               quels fichiers surveiller (pour l'instant en dur,
     *               configurable plus tard via collectorConfigs).
     */
    @Override
    protected void collect(AgentConfig config) {

        // ── Étape 1 : initialiser les tailers ───────────────────
        // On crée un LogTailer par fichier à surveiller.
        // Chaque tailer reçoit le chemin du fichier et le sourceType
        // correspondant (contrat avec le serveur).
        initializeTailers();

        System.out.println("[" + NAME + "] Watching " + tailers.size() + " file(s).");

        // ── Étape 2 : boucle de surveillance ────────────────────
        // isRunning() est défini dans AbstractCollector.
        // Il retourne false quand stop() est appelé.
        while (isRunning()) {

            // Pour chaque fichier surveillé, on vérifie s'il y a
            // de nouvelles lignes.
            for (LogTailer tailer : tailers) {
                try {
                    List<String> newLines = tailer.readNewLines();

                    // Pour chaque nouvelle ligne, on crée un RawEvent
                    // et on le pousse dans la file d'attente.
                    for (String line : newLines) {
                        RawEvent event = new RawEvent(tailer.getSourceType(), line);

                        // offer() retourne false si la queue est pleine.
                        // Dans ce cas, l'événement est perdu (backpressure).
                        // Le stateStore comptera cet événement comme "dropped".
                        eventQueue.offer(event);
                    }

                } catch (Exception e) {
                    // Si un tailer individuel échoue (ex: le fichier est
                    // temporairement inaccessible), on continue avec les autres.
                    // On ne veut PAS qu'une erreur sur auth.log empêche
                    // la surveillance de syslog.
                    System.err.println("[" + NAME + "] Error tailing "
                            + tailer.getFilePath().getFileName() + " : " + e.getMessage());
                }
            }

            // ── Attente avant le prochain cycle ─────────────────
            try {
                Thread.sleep(POLL_INTERVAL_MS);
            } catch (InterruptedException e) {
                // Si le thread est interrompu (par stop()), on remet
                // le flag d'interruption et on sort de la boucle.
                //
                // POURQUOI remettre le flag ?
                // Thread.sleep() "consomme" l'interruption (elle remet
                // le flag à false). En le restaurant, on permet au code
                // appelant (AbstractCollector) de savoir que l'interruption
                // a eu lieu.
                Thread.currentThread().interrupt();
                break;
            }
        }

        // ── Nettoyage ───────────────────────────────────────────
        tailers.clear();
    }

    // ═══════════════════════════════════════════════════════════
    //  MÉTHODES INTERNES
    // ═══════════════════════════════════════════════════════════

    /**
     * Crée les LogTailer pour chaque fichier à surveiller.
     *
     * Pour l'instant les fichiers sont en dur. Plus tard, ils viendront
     * de collectorConfigs dans la config serveur :
     *   "LogCollector": { "watchedFiles": ["/var/log/auth.log", ...] }
     *
     * NOTE SUR LES CHEMINS :
     * Ces fichiers existent sur les systèmes Debian/Ubuntu.
     * Sur d'autres distributions (CentOS, Arch...), les chemins
     * peuvent être différents (ex: /var/log/secure au lieu de auth.log).
     * Si un fichier n'existe pas, le LogTailer retournera simplement
     * une liste vide — pas de crash.
     */
    private void initializeTailers() {
        tailers.clear();

        // Détection de la famille de l'OS
        boolean isRedHatFamily = Files.exists(Path.of("/etc/redhat-release")) ||
                Files.exists(Path.of("/etc/fedora-release"));

        if (isRedHatFamily) {
            System.out.println("[" + NAME + "] Red Hat/Fedora family detected.");
            tailers.add(new LogTailer(Path.of("/var/log/secure"), "linux.auth.log"));
            tailers.add(new LogTailer(Path.of("/var/log/messages"), "linux.syslog"));
        } else {
            System.out.println("[" + NAME + "] Debian/Ubuntu family (or fallback) detected.");
            tailers.add(new LogTailer(Path.of("/var/log/auth.log"), "linux.auth.log"));
            tailers.add(new LogTailer(Path.of("/var/log/syslog"), "linux.syslog"));
        }

        tailers.add(new LogTailer(Path.of("/var/log/kern.log"), "linux.kern.log"));

        // Note : le LogTailer est déjà conçu pour ignorer silencieusement
        // les fichiers qui n'existent pas grâce à ta vérification Files.exists(filePath),
        // ce qui rend cette approche totalement "safe".
    }
}