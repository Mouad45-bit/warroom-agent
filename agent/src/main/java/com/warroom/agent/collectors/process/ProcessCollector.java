package com.warroom.agent.collectors.process;

import com.warroom.agent.collectors.base.AbstractCollector;
import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.transmission.LocalEventQueue;
import com.warroom.agent.transmission.model.RawEvent;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Collecteur de processus — inventaire des programmes en cours d'exécution.
 *
 * ══════════════════════════════════════════════════════════════
 *  RÔLE DANS L'ARCHITECTURE
 * ══════════════════════════════════════════════════════════════
 *
 * Ce collecteur exécute périodiquement la commande "ps aux"
 * et envoie la liste complète des processus au serveur.
 *
 * C'est grâce à ces données que le serveur (Personne B) pourra
 * détecter des anomalies comme :
 *   - des processus inconnus (malware, reverse shell, backdoor)
 *   - des cryptominers (consommation CPU anormale)
 *   - des processus exécutés sous un utilisateur inattendu
 *   - des outils offensifs (nmap, netcat, mimikatz...)
 *
 * ══════════════════════════════════════════════════════════════
 *  LA COMMANDE "ps aux"
 * ══════════════════════════════════════════════════════════════
 *
 * "ps" (process status) affiche les processus en cours.
 *
 * Signification des flags :
 *   a → afficher les processus de TOUS les utilisateurs
 *       (pas seulement ceux du terminal courant)
 *   u → format "user-oriented" (affiche l'utilisateur, le %CPU, le %MEM...)
 *   x → inclure les processus sans terminal de contrôle
 *       (les démons, les services, les processus de fond)
 *
 * Exemple de sortie :
 *   USER       PID %CPU %MEM    VSZ   RSS TTY  STAT START  TIME COMMAND
 *   root         1  0.0  0.1 169396 13200 ?    Ss   10:00  0:01 /sbin/init
 *   root       512  0.2  0.3  72896 28000 ?    Ss   10:00  0:15 /usr/sbin/sshd
 *   www-data  1234  1.5  2.0 524288 163840 ?   Sl   10:05  1:23 /usr/sbin/nginx
 *   hacker    9999 99.0  5.0 999999 500000 ?   R    11:30  5:00 ./xmrig --coin=XMR
 *
 * La dernière ligne serait un cryptominer → le serveur le détecterait.
 *
 * ══════════════════════════════════════════════════════════════
 *  DIFFÉRENCE AVEC NetworkCollector
 * ══════════════════════════════════════════════════════════════
 *
 * Ce collecteur suit exactement le même pattern que NetworkCollector
 * (exécuter une commande → envoyer le résultat → attendre → recommencer).
 *
 * Les seules différences :
 *   - La commande : "ps aux" au lieu de "ss -tunap"
 *   - Le sourceType : "process.list" au lieu de "network.connections"
 *   - L'intervalle : 60 secondes au lieu de 30
 *     (la liste des processus change moins vite que les connexions)
 */
public class ProcessCollector extends AbstractCollector {

    // ═══════════════════════════════════════════════════════════
    //  CONSTANTES
    // ═══════════════════════════════════════════════════════════

    private static final String NAME = "ProcessCollector";

    /**
     * Le sourceType envoyé avec chaque snapshot de processus.
     * Le serveur utilisera ce champ pour router vers le ProcessAnalyzer.
     */
    private static final String SOURCE_TYPE = "process.list";

    /**
     * Intervalle entre deux captures (en millisecondes).
     *
     * 60 secondes est suffisant car :
     *   - un malware lancé à 10:30:05 sera visible au plus tard à 10:31:05
     *   - la commande ps elle-même est très légère
     *   - on évite de surcharger la queue avec trop de snapshots
     */
    private static final long INTERVAL_MS = 60_000;

    /** Commande à exécuter. */
    private static final String[] COMMAND = {"ps", "aux"};

    /** Timeout de la commande en secondes. */
    private static final long COMMAND_TIMEOUT_SECONDS = 10;

    // ═══════════════════════════════════════════════════════════
    //  CONSTRUCTEUR
    // ═══════════════════════════════════════════════════════════

    public ProcessCollector(LocalEventQueue eventQueue) {
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
     * Boucle principale : exécute ps aux périodiquement.
     *
     * Même structure que NetworkCollector.collect() :
     *   exécuter → envoyer → dormir → recommencer
     */
    @Override
    protected void collect(AgentConfig config) {

        while (isRunning()) {

            try {
                String output = executeCommand(COMMAND);

                if (output != null && !output.isBlank()) {
                    eventQueue.offer(new RawEvent(SOURCE_TYPE, output));
                }

            } catch (Exception e) {
                System.err.println("[" + NAME + "] Command execution failed : " + e.getMessage());
            }

            // ── Attente ─────────────────────────────────────────
            try {
                Thread.sleep(INTERVAL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  EXÉCUTION DE COMMANDE
    // ═══════════════════════════════════════════════════════════

    /**
     * Exécute la commande ps aux et retourne sa sortie.
     *
     * Le code est similaire à NetworkCollector.executeCommand().
     * On pourrait factoriser dans AbstractCollector ou dans une
     * classe utilitaire CommandRunner, mais pour le MVP on garde
     * chaque collecteur autonome et lisible.
     *
     * @return la sortie standard de la commande, ou null en cas d'erreur
     */
    private String executeCommand(String[] command) {
        try {
            ProcessBuilder builder = new ProcessBuilder(command);
            builder.redirectErrorStream(true);

            Process process = builder.start();

            String output;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                output = reader.lines().collect(Collectors.joining("\n"));
            }

            boolean finished = process.waitFor(COMMAND_TIMEOUT_SECONDS, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                System.err.println("[" + NAME + "] Command timed out.");
                return null;
            }

            return output;

        } catch (Exception e) {
            System.err.println("[" + NAME + "] Failed to execute command : " + e.getMessage());
            return null;
        }
    }
}