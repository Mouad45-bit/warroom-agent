package com.warroom.agent.collectors.network;

import com.warroom.agent.collectors.base.AbstractCollector;
import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.transmission.LocalEventQueue;
import com.warroom.agent.transmission.model.RawEvent;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

/**
 * Collecteur de connexions réseau — cartographie du trafic en temps réel.
 *
 * ══════════════════════════════════════════════════════════════
 *  RÔLE DANS L'ARCHITECTURE
 * ══════════════════════════════════════════════════════════════
 *
 * Ce collecteur exécute périodiquement la commande système "ss -tunap"
 * et envoie la sortie brute au serveur pour analyse.
 *
 * C'est grâce à ces données que le serveur (Personne B) pourra
 * détecter des anomalies comme :
 *   - des connexions sortantes vers des IP suspectes (C2 servers)
 *   - des ports inhabituels ouverts en écoute (backdoors)
 *   - des connexions depuis des IP étrangères au réseau local
 *   - un processus inconnu qui ouvre des sockets réseau
 *
 * ══════════════════════════════════════════════════════════════
 *  LA COMMANDE "ss -tunap"
 * ══════════════════════════════════════════════════════════════
 *
 * "ss" est le remplacement moderne de "netstat" sur Linux.
 *
 * Signification des flags :
 *   -t → afficher les connexions TCP
 *   -u → afficher les connexions UDP
 *   -n → afficher les adresses IP numériques (pas de résolution DNS,
 *         plus rapide et plus fiable)
 *   -a → afficher TOUTES les sockets (y compris celles en écoute)
 *   -p → afficher le processus propriétaire de chaque socket
 *         (nécessite les droits root pour voir tous les processus)
 *
 * Exemple de sortie :
 *   State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
 *   ESTAB   0       0       192.168.1.10:22     192.168.1.50:49832 users:(("sshd",pid=1234,...))
 *   LISTEN  0       128     0.0.0.0:80          0.0.0.0:*          users:(("nginx",pid=5678,...))
 *
 * ══════════════════════════════════════════════════════════════
 *  PATTERN : COLLECTEUR DE COMMANDE
 * ══════════════════════════════════════════════════════════════
 *
 * Ce collecteur utilise le pattern "exécuter une commande périodiquement" :
 *   1. Dormir pendant INTERVAL secondes
 *   2. Exécuter la commande avec ProcessBuilder
 *   3. Capturer la sortie standard (stdout)
 *   4. Envoyer la sortie comme un RawEvent
 *   5. Retour à l'étape 1
 *
 * Ce même pattern est réutilisé par ProcessCollector.
 * La différence est la commande exécutée et le sourceType.
 */
public class NetworkCollector extends AbstractCollector {

    // ═══════════════════════════════════════════════════════════
    //  CONSTANTES
    // ═══════════════════════════════════════════════════════════

    private static final String NAME = "NetworkCollector";

    /**
     * Le sourceType envoyé avec chaque événement réseau.
     * Le serveur utilisera ce champ pour router vers le NetworkAnalyzer.
     */
    private static final String SOURCE_TYPE = "network.connections";

    /**
     * Intervalle entre deux exécutions de la commande (en millisecondes).
     *
     * 30 secondes est un bon compromis :
     *   - assez fréquent pour détecter une connexion suspecte rapidement
     *   - assez espacé pour ne pas surcharger le système
     *
     * La commande ss elle-même est très rapide (quelques millisecondes).
     */
    private static final long INTERVAL_MS = 30_000;

    /**
     * La commande à exécuter.
     * Chaque élément du tableau est un argument séparé.
     *
     * POURQUOI UN TABLEAU ET PAS UNE STRING ?
     * ProcessBuilder attend des arguments séparés. Si on passait
     * "ss -tunap" comme une seule string, le système chercherait
     * un programme nommé littéralement "ss -tunap" (avec l'espace).
     */
    private static final String[] COMMAND = {"ss", "-tunap"};

    /**
     * Timeout maximum pour l'exécution de la commande (en secondes).
     * Si la commande ne se termine pas en 10 secondes, on la tue.
     * C'est une sécurité contre les commandes bloquées.
     */
    private static final long COMMAND_TIMEOUT_SECONDS = 10;

    // ═══════════════════════════════════════════════════════════
    //  CONSTRUCTEUR
    // ═══════════════════════════════════════════════════════════

    public NetworkCollector(LocalEventQueue eventQueue) {
        super(eventQueue);
    }

    // ═══════════════════════════════════════════════════════════
    //  IMPLÉMENTATION
    // ═══════════════════════════════════════════════════════════

    @Override
    protected String collectorName() {
        return NAME;
    }

    /**
     * Boucle principale : exécute la commande ss périodiquement.
     *
     * Le cycle est :
     *   exécuter → envoyer → dormir → recommencer
     *
     * On exécute AVANT de dormir (et non l'inverse) pour avoir
     * un premier snapshot immédiatement au démarrage du collecteur.
     */
    @Override
    protected void collect(AgentConfig config) {

        while (isRunning()) {

            try {
                // ── Exécution de la commande ────────────────────
                String output = executeCommand(COMMAND);

                // ── Envoi si la sortie n'est pas vide ───────────
                // La sortie peut être vide si la commande échoue
                // (pas de droits, commande absente...).
                if (output != null && !output.isBlank()) {
                    eventQueue.offer(new RawEvent(SOURCE_TYPE, output));
                }

            } catch (Exception e) {
                // On log l'erreur mais on ne crashe PAS.
                // On réessaiera au prochain cycle.
                System.err.println("[" + NAME + "] Command execution failed : " + e.getMessage());
            }

            // ── Attente avant le prochain cycle ─────────────────
            try {
                Thread.sleep(INTERVAL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  EXÉCUTION DE COMMANDE SYSTÈME
    // ═══════════════════════════════════════════════════════════

    /**
     * Exécute une commande système et retourne sa sortie standard (stdout).
     *
     * COMMENT ÇA MARCHE (ProcessBuilder) :
     *
     *   ProcessBuilder est la façon standard en Java de lancer un
     *   programme externe (comme si on tapait la commande dans un terminal).
     *
     *   Les étapes :
     *     1. new ProcessBuilder(command) → prépare la commande
     *     2. redirectErrorStream(true) → fusionne stderr dans stdout
     *        (ainsi on capture aussi les messages d'erreur)
     *     3. start() → lance le processus externe
     *     4. process.getInputStream() → lit la sortie du processus
     *     5. process.waitFor(timeout) → attend que le processus se termine
     *
     * @param command la commande à exécuter (tableau d'arguments)
     * @return la sortie standard de la commande, ou null en cas d'erreur
     */
    protected String executeCommand(String[] command) {
        try {
            // Prépare et lance la commande.
            ProcessBuilder builder = new ProcessBuilder(command);

            // Fusionne stderr dans stdout. Comme ça, si la commande
            // affiche une erreur (ex: "permission denied"), on la
            // capture aussi au lieu de la perdre silencieusement.
            builder.redirectErrorStream(true);

            Process process = builder.start();

            // Lecture de la sortie du processus.
            // On utilise BufferedReader pour lire ligne par ligne,
            // puis Collectors.joining("\n") pour reconstituer le texte complet.
            String output;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                output = reader.lines().collect(Collectors.joining("\n"));
            }

            // Attente de la fin du processus avec un timeout.
            // waitFor() retourne true si le processus s'est terminé
            // dans le délai, false s'il a été tué par timeout.
            boolean finished = process.waitFor(COMMAND_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);

            if (!finished) {
                // Le processus est bloqué → on le tue de force.
                process.destroyForcibly();
                System.err.println("[" + NAME + "] Command timed out after "
                        + COMMAND_TIMEOUT_SECONDS + "s. Killed.");
                return null;
            }

            // Vérification du code de retour.
            // En Linux, un code 0 = succès, tout autre code = erreur.
            int exitCode = process.exitValue();
            if (exitCode != 0) {
                System.err.println("[" + NAME + "] Command exited with code " + exitCode
                        + ". Output: " + truncate(output, 200));
                // On retourne quand même la sortie : même avec un code d'erreur,
                // il peut y avoir des données partielles utiles.
            }

            return output;

        } catch (Exception e) {
            System.err.println("[" + NAME + "] Failed to execute command : " + e.getMessage());
            return null;
        }
    }

    /**
     * Tronque un texte à une longueur maximale (pour les logs).
     * Évite de polluer la console avec des sorties de 500 lignes.
     */
    private static String truncate(String text, int maxLength) {
        if (text == null) return "null";
        if (text.length() <= maxLength) return text;
        return text.substring(0, maxLength) + "... [truncated]";
    }
}