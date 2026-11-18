package com.warroom.agent.collectors.log;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Lecteur incrémental ("tail") pour UN fichier de log.
 *
 * ══════════════════════════════════════════════════════════════
 *  POURQUOI CETTE CLASSE EXISTE (SÉPARATION DES RESPONSABILITÉS)
 * ══════════════════════════════════════════════════════════════
 *
 * Le LogCollector surveille PLUSIEURS fichiers à la fois
 * (auth.log, syslog, kern.log...). Chaque fichier a besoin
 * de garder en mémoire son propre "curseur" (position de lecture).
 *
 * Plutôt que de tout mettre dans LogCollector, on encapsule
 * la logique d'un seul fichier ici. Le LogCollector possède
 * ensuite une LISTE de LogTailer, un par fichier.
 *
 * ══════════════════════════════════════════════════════════════
 *  COMMENT ÇA MARCHE (LE PRINCIPE DU TAIL)
 * ══════════════════════════════════════════════════════════════
 *
 * Le principe est le même que la commande Linux "tail -f" :
 *
 *   1. On ouvre le fichier et on se place À LA FIN.
 *      On ne veut pas relire tout l'historique — juste les nouvelles lignes.
 *
 *   2. Toutes les X millisecondes, on regarde si le fichier a grandi.
 *      Si oui, on lit les nouvelles lignes et on avance le curseur.
 *
 *   3. Si le fichier a RÉTRÉCI (taille < curseur), ça veut dire
 *      que "logrotate" a fait une rotation : l'ancien fichier a été
 *      archivé et un nouveau fichier vide a pris sa place.
 *      Dans ce cas, on repart du début (curseur = 0).
 *
 * ══════════════════════════════════════════════════════════════
 *  POURQUOI RandomAccessFile ET PAS BufferedReader ?
 * ══════════════════════════════════════════════════════════════
 *
 * BufferedReader lit séquentiellement : une fois qu'on a lu jusqu'à
 * la fin, on est bloqué. On ne peut pas "revenir" ni "sauter" à un
 * endroit précis dans le fichier.
 *
 * RandomAccessFile, lui, permet de :
 *   - connaître la position courante (getFilePointer())
 *   - sauter à un endroit précis (seek(position))
 *   - connaître la taille totale du fichier (length())
 *
 * C'est exactement ce qu'il nous faut pour le tail :
 *   seek(offset) → readLine() → offset = getFilePointer()
 */
public class LogTailer {

    // ═══════════════════════════════════════════════════════════
    //  ATTRIBUTS
    // ═══════════════════════════════════════════════════════════

    /**
     * Le chemin absolu du fichier surveillé.
     * Exemple : /var/log/auth.log
     */
    private final Path filePath;

    /**
     * Le "sourceType" associé à ce fichier, tel que défini dans le contrat
     * partagé avec le serveur (Personne B).
     *
     * Exemples :
     *   /var/log/auth.log   → "linux.auth.log"
     *   /var/log/syslog     → "linux.syslog"
     *   /var/log/kern.log   → "linux.kern.log"
     *
     * Ce champ sera passé au RawEvent pour que le serveur sache quel
     * Analyzer utiliser pour traiter cet événement.
     */
    private final String sourceType;

    /**
     * La position dans le fichier jusqu'où on a déjà lu.
     *
     * Au premier appel, on se positionne à la fin du fichier (= sa taille).
     * Ensuite, à chaque readNewLines(), on lit de "offset" jusqu'à la fin
     * actuelle du fichier, et on met à jour offset.
     *
     * Si logrotate remplace le fichier, la nouvelle taille sera < offset,
     * et on remet offset à 0 pour repartir du début.
     */
    private long offset = -1;

    // ═══════════════════════════════════════════════════════════
    //  CONSTRUCTEUR
    // ═══════════════════════════════════════════════════════════

    /**
     * @param filePath   chemin du fichier à surveiller
     * @param sourceType le sourceType qui sera attaché à chaque RawEvent
     *                   produit à partir de ce fichier
     */
    public LogTailer(Path filePath, String sourceType) {
        this.filePath = filePath;
        this.sourceType = sourceType;
    }

    // ═══════════════════════════════════════════════════════════
    //  GETTERS
    // ═══════════════════════════════════════════════════════════

    public Path getFilePath() {
        return filePath;
    }

    public String getSourceType() {
        return sourceType;
    }

    // ═══════════════════════════════════════════════════════════
    //  LOGIQUE PRINCIPALE : LECTURE DES NOUVELLES LIGNES
    // ═══════════════════════════════════════════════════════════

    /**
     * Lit les nouvelles lignes apparues dans le fichier depuis le dernier appel.
     *
     * FONCTIONNEMENT DÉTAILLÉ :
     *
     *   Appel 1 (initialisation) :
     *     Le fichier fait 5000 octets. offset vaut -1 (pas encore initialisé).
     *     → On positionne offset = 5000 (on saute tout l'historique).
     *     → On retourne une liste vide (rien de "nouveau").
     *
     *   Appel 2 (nouvelles lignes) :
     *     Le fichier fait maintenant 5200 octets. offset vaut 5000.
     *     → 5200 > 5000, donc on a 200 octets de nouvelles données.
     *     → On ouvre le fichier, seek(5000), on lit les lignes.
     *     → On retourne les lignes lues. offset passe à 5200.
     *
     *   Appel 3 (logrotate détecté) :
     *     Le fichier fait maintenant 300 octets. offset vaut 5200.
     *     → 300 < 5200 → le fichier a été remplacé (rotation).
     *     → On remet offset = 0 et on lit depuis le début.
     *
     * @return la liste des nouvelles lignes (vide si rien de nouveau,
     *         ou si le fichier n'existe pas)
     */
    public List<String> readNewLines() {

        // ── Vérification d'existence ────────────────────────────
        // Le fichier peut ne pas exister sur certains systèmes
        // (ex: kern.log n'existe pas sur tous les Linux).
        // Dans ce cas, on retourne simplement une liste vide sans erreur.
        if (!Files.exists(filePath)) {
            return Collections.emptyList();
        }

        // ── try-with-resources ──────────────────────────────────
        // RandomAccessFile implémente AutoCloseable : le fichier
        // sera automatiquement fermé à la fin du bloc try, même
        // si une exception est levée. C'est crucial pour ne pas
        // laisser des descripteurs de fichiers ouverts (fuite de ressources).
        //
        // "r" = mode lecture seule (on ne modifie jamais les logs).
        try (RandomAccessFile raf = new RandomAccessFile(filePath.toFile(), "r")) {

            long fileLength = raf.length();

            // ── Premier appel : initialisation ──────────────────
            // On se positionne à la fin du fichier pour ne lire
            // que les FUTURES lignes, pas l'historique.
            if (offset < 0) {
                offset = fileLength;
                return Collections.emptyList();
            }

            // ── Détection de rotation (logrotate) ───────────────
            // Si le fichier est devenu plus petit que notre curseur,
            // c'est que logrotate a remplacé le fichier par un nouveau.
            // On repart de zéro pour lire le nouveau fichier.
            if (fileLength < offset) {
                System.out.println("[LogTailer] Rotation detected on " + filePath.getFileName()
                        + ". Resetting offset from " + offset + " to 0.");
                offset = 0;
            }

            // ── Rien de nouveau ─────────────────────────────────
            // La taille n'a pas changé depuis la dernière lecture.
            if (fileLength == offset) {
                return Collections.emptyList();
            }

            // ── Lecture des nouvelles lignes ─────────────────────
            // seek() positionne le curseur de lecture à l'endroit
            // exact où on s'était arrêté la dernière fois.
            raf.seek(offset);

            List<String> newLines = new ArrayList<>();
            String line;

            // readLine() lit une ligne et retourne null quand on
            // atteint la fin du fichier.
            while ((line = raf.readLine()) != null) {
                // Ignorer les lignes vides (certains logs ajoutent
                // des lignes blanches lors de la rotation).
                if (!line.isBlank()) {
                    newLines.add(line);
                }
            }

            // Mise à jour du curseur : on se souvient de la position
            // actuelle pour la prochaine fois.
            offset = raf.getFilePointer();

            return newLines;

        } catch (IOException e) {
            // Si on ne peut pas lire le fichier (permissions, fichier verrouillé, etc.),
            // on log l'erreur mais on ne crashe PAS le collecteur.
            // On retournera une liste vide, et on réessaiera au prochain tick.
            System.err.println("[LogTailer] Error reading " + filePath + " : " + e.getMessage());
            return Collections.emptyList();
        }
    }
}