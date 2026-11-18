package com.warroom.agent.collectors.file;

import com.warroom.agent.collectors.base.AbstractCollector;
import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.transmission.LocalEventQueue;
import com.warroom.agent.transmission.model.RawEvent;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Collecteur d'intégrité des fichiers — détection de modifications suspectes.
 *
 * ══════════════════════════════════════════════════════════════
 *  RÔLE DANS L'ARCHITECTURE
 * ══════════════════════════════════════════════════════════════
 *
 * Ce collecteur vérifie que les fichiers critiques du système
 * n'ont pas été modifiés. Il calcule périodiquement un "fingerprint"
 * (empreinte SHA-256) de chaque fichier, et si l'empreinte change,
 * il envoie une alerte au serveur.
 *
 * C'est le collecteur le plus critique en terme de sévérité :
 * une modification de /etc/shadow ou /etc/sudoers est presque
 * toujours le signe d'une intrusion confirmée.
 *
 * ══════════════════════════════════════════════════════════════
 *  TROIS FAMILLES DE FICHIERS SURVEILLÉS
 * ══════════════════════════════════════════════════════════════
 *
 * 1. FICHIERS SYSTÈME (chemins fixes)
 *    /etc/passwd, /etc/shadow, /etc/sudoers, /etc/ssh/sshd_config
 *    → Détecte : ajout d'utilisateur backdoor, changement de mot de passe,
 *      élévation de privilèges, modification de la config SSH.
 *
 * 2. FICHIERS CRON (chemins fixes + dynamiques)
 *    /etc/crontab, /etc/cron.d/*, /var/spool/cron/crontabs/*
 *    → Détecte : persistance par tâche planifiée. Un attaquant ajoute
 *      une ligne pour relancer son malware chaque minute.
 *
 * 3. CLÉS SSH AUTORISÉES (chemins dynamiques)
 *    /root/.ssh/authorized_keys et /home/<user>/.ssh/authorized_keys
 *    → Détecte : persistance par clé SSH. Un attaquant ajoute sa clé
 *      publique pour se connecter sans mot de passe, silencieusement.
 *
 * ══════════════════════════════════════════════════════════════
 *  POURQUOI CRON EST CRITIQUE (PERSISTANCE)
 * ══════════════════════════════════════════════════════════════
 *
 * "cron" est le planificateur de tâches de Linux. Il exécute des
 * commandes à intervalles réguliers (chaque minute, chaque heure...).
 *
 * Un attaquant qui veut survivre à un reboot ou à la mort de son
 * processus malveillant ajoute une ligne dans un fichier cron :
 *
 *   * * * * * /tmp/.hidden/reverse_shell.sh
 *
 * Résultat : même si l'admin tue le processus malveillant, cron
 * le relance automatiquement à la minute suivante. C'est l'une des
 * techniques de persistance les plus utilisées.
 *
 * Les fichiers cron sont répartis à plusieurs endroits :
 *
 *   /etc/crontab
 *     → Le crontab système global. Contient des tâches de maintenance
 *       (rotation de logs, mises à jour...). Rarement modifié par un admin.
 *       Toute modification est suspecte.
 *
 *   /etc/cron.d/
 *     → Un dossier qui contient des fichiers cron supplémentaires.
 *       Chaque fichier = un ensemble de tâches. Les paquets Debian
 *       y installent leurs tâches planifiées. Un attaquant peut y
 *       ajouter un fichier discret (ex: "system-update" pour se fondre
 *       dans la masse).
 *
 *   /var/spool/cron/crontabs/
 *     → Les crontabs per-utilisateur (créés via "crontab -e").
 *       Chaque utilisateur a son propre fichier ici.
 *       Un attaquant qui compromet un compte utilisateur peut y
 *       ajouter sa tâche de persistance.
 *
 * ══════════════════════════════════════════════════════════════
 *  POURQUOI AUTHORIZED_KEYS EST CRITIQUE (PERSISTANCE SILENCIEUSE)
 * ══════════════════════════════════════════════════════════════
 *
 * SSH permet l'authentification par clé publique : au lieu d'un
 * mot de passe, on prouve son identité avec une clé cryptographique.
 *
 * Le fichier ~/.ssh/authorized_keys contient la liste des clés
 * publiques autorisées à se connecter à ce compte utilisateur.
 *
 * Un attaquant qui a obtenu un accès (même temporaire) peut ajouter
 * sa propre clé publique dans ce fichier. Résultat :
 *
 *   - Il peut se reconnecter à tout moment, sans mot de passe
 *   - La connexion par clé NE GÉNÈRE PAS de "Failed password" dans auth.log
 *   - Même si l'admin change le mot de passe, l'attaquant garde l'accès
 *   - La clé ressemble à une longue chaîne de caractères aléatoires :
 *     impossible de distinguer une clé légitime d'une clé malveillante
 *     juste en la regardant
 *
 * C'est pourquoi on surveille le HASH du fichier : si une clé est
 * ajoutée ou supprimée, le hash change, et on alerte.
 *
 * DIFFICULTÉ : contrairement à /etc/passwd (un seul chemin fixe),
 * authorized_keys est dans le dossier home de chaque utilisateur.
 * On ne peut pas hardcoder les chemins car on ne connaît pas les
 * utilisateurs à l'avance. Il faut les DÉCOUVRIR dynamiquement en
 * listant /home/* et en cherchant .ssh/authorized_keys dans chacun.
 */
public class FileIntegrityCollector extends AbstractCollector {

    // ═══════════════════════════════════════════════════════════
    //  CONSTANTES
    // ═══════════════════════════════════════════════════════════

    private static final String NAME = "FileIntegrityCollector";
    private static final String SOURCE_TYPE = "file.integrity";
    private static final long INTERVAL_MS = 120_000; // 2 minutes

    /**
     * FAMILLE 1 — Fichiers système à chemins fixes.
     *
     * Ce sont des fichiers qui existent toujours au même endroit
     * sur toute distribution Linux.
     */
    private static final List<Path> SYSTEM_FILES = List.of(
            Path.of("/etc/passwd"),
            Path.of("/etc/shadow"),
            Path.of("/etc/sudoers"),
            Path.of("/etc/ssh/sshd_config")
    );

    /**
     * FAMILLE 2 — Fichiers cron à chemins fixes.
     *
     * NOTE : /etc/cron.d est un DOSSIER, pas un fichier.
     * On ne peut pas hasher un dossier directement.
     * Les fichiers individuels à l'intérieur seront découverts
     * dynamiquement dans discoverCronFiles().
     */
    private static final List<Path> CRON_FILES = List.of(
            // Le crontab système global.
            Path.of("/etc/crontab"),

            // Les fichiers "allow" et "deny" de cron : qui a le droit
            // d'utiliser crontab. Si un attaquant modifie cron.allow
            // pour s'y ajouter, c'est suspect.
            Path.of("/etc/cron.allow"),
            Path.of("/etc/cron.deny")
    );

    // ═══════════════════════════════════════════════════════════
    //  ATTRIBUTS
    // ═══════════════════════════════════════════════════════════

    /**
     * La baseline : les hashes de référence calculés au premier lancement.
     *
     * Clé   = chemin du fichier (ex: /etc/passwd)
     * Valeur = hash SHA-256 en hexadécimal
     *
     * LinkedHashMap pour conserver l'ordre d'insertion (logs lisibles).
     */
    private final Map<Path, String> baseline = new LinkedHashMap<>();

    /**
     * La liste COMPLÈTE de tous les fichiers à surveiller.
     *
     * Construite dynamiquement au démarrage : on commence par les
     * fichiers à chemins fixes (SYSTEM_FILES + CRON_FILES), puis
     * on ajoute les fichiers découverts dynamiquement (cron.d/*,
     * crontabs per-user, authorized_keys).
     *
     * Cette liste est recalculée à chaque cycle de vérification
     * pour détecter les NOUVEAUX fichiers (un nouvel utilisateur
     * créé après le démarrage de l'agent aura un authorized_keys
     * qu'on doit aussi surveiller).
     */
    private List<Path> allWatchedFiles = new ArrayList<>();

    // ═══════════════════════════════════════════════════════════
    //  CONSTRUCTEUR
    // ═══════════════════════════════════════════════════════════

    public FileIntegrityCollector(LocalEventQueue eventQueue) {
        super(eventQueue);
    }

    // ═══════════════════════════════════════════════════════════
    //  IMPLÉMENTATION
    // ═══════════════════════════════════════════════════════════

    @Override
    protected String collectorName() {
        return NAME;
    }

    @Override
    protected void collect(AgentConfig config) {

        // ── Phase 1 : construire la liste de fichiers et la baseline ─
        refreshWatchedFiles();
        buildBaseline();
        System.out.println("[" + NAME + "] Baseline built for " + baseline.size()
                + " file(s) out of " + allWatchedFiles.size() + " discovered.");

        // ── Phase 2 : boucle de vérification périodique ─────────
        while (isRunning()) {

            try {
                Thread.sleep(INTERVAL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }

            // On redécouvre les fichiers à chaque cycle.
            // POURQUOI ? Parce qu'entre deux vérifications :
            //   - un nouvel utilisateur a pu être créé → nouveau authorized_keys
            //   - un nouveau fichier cron.d a pu apparaître
            //   - un crontab per-user a pu être créé via "crontab -e"
            // Si on ne redécouvrait pas, on raterait ces ajouts.
            refreshWatchedFiles();

            checkIntegrity();
        }

        baseline.clear();
        allWatchedFiles.clear();
    }

    // ═══════════════════════════════════════════════════════════
    //  DÉCOUVERTE DES FICHIERS À SURVEILLER
    // ═══════════════════════════════════════════════════════════

    /**
     * Reconstruit la liste complète de tous les fichiers à surveiller.
     *
     * Cette méthode fusionne :
     *   1. Les fichiers système à chemins fixes
     *   2. Les fichiers cron à chemins fixes
     *   3. Les fichiers cron découverts dynamiquement
     *   4. Les fichiers authorized_keys découverts dynamiquement
     */
    private void refreshWatchedFiles() {
        allWatchedFiles = new ArrayList<>();

        // 1. Fichiers système fixes
        allWatchedFiles.addAll(SYSTEM_FILES);

        // 2. Fichiers cron fixes
        allWatchedFiles.addAll(CRON_FILES);

        // 3. Fichiers cron dynamiques (cron.d/* et crontabs per-user)
        allWatchedFiles.addAll(discoverCronFiles());

        // 4. Fichiers authorized_keys (per-user)
        allWatchedFiles.addAll(discoverAuthorizedKeysFiles());
    }

    /**
     * Découvre les fichiers cron à chemins dynamiques.
     *
     * ── /etc/cron.d/ ────────────────────────────────────────
     *
     * Ce dossier contient des fichiers cron "supplémentaires".
     * Chaque paquet installé (ex: logrotate, certbot, apt) peut
     * y déposer son propre fichier cron. L'avantage par rapport
     * à /etc/crontab est que chaque paquet a son fichier séparé :
     * c'est plus propre et plus facile à gérer.
     *
     * Un attaquant rusé crée un fichier ici plutôt que de modifier
     * /etc/crontab : c'est moins visible car l'admin vérifiera
     * souvent /etc/crontab mais rarement les fichiers dans cron.d/.
     *
     * ── /var/spool/cron/crontabs/ ───────────────────────────
     *
     * Ce dossier contient un fichier par utilisateur qui a utilisé
     * la commande "crontab -e". Le fichier porte le nom de l'utilisateur.
     *
     * Exemples :
     *   /var/spool/cron/crontabs/root    → crontab de root
     *   /var/spool/cron/crontabs/mouad   → crontab de mouad
     *
     * PERMISSIONS : ce dossier est souvent lisible uniquement par root.
     * Si l'agent ne tourne pas en root, ces fichiers seront ignorés
     * (computeHash retournera null car Files.isReadable() = false).
     *
     * @return la liste des fichiers cron découverts
     */
    private List<Path> discoverCronFiles() {
        List<Path> discovered = new ArrayList<>();

        // Lister /etc/cron.d/
        discovered.addAll(listFilesIn(Path.of("/etc/cron.d")));

        // Lister /var/spool/cron/crontabs/
        discovered.addAll(listFilesIn(Path.of("/var/spool/cron/crontabs")));

        return discovered;
    }

    /**
     * Découvre les fichiers authorized_keys de tous les utilisateurs.
     *
     * ── STRATÉGIE DE DÉCOUVERTE ────────────────────────────
     *
     * On ne peut pas hardcoder les chemins car on ne connaît pas
     * les utilisateurs à l'avance. La stratégie est :
     *
     *   1. Vérifier /root/.ssh/authorized_keys (root a son home à /root)
     *   2. Lister tous les dossiers dans /home/ (un par utilisateur)
     *   3. Pour chaque dossier, vérifier si .ssh/authorized_keys existe
     *
     * ── POURQUOI ON SURVEILLE AUSSI authorized_keys2 ────────
     *
     * Le fichier authorized_keys2 est un alias historique.
     * Certaines vieilles configurations SSH le lisent en plus de
     * authorized_keys. Un attaquant malin pourrait y mettre sa clé
     * en sachant que l'admin ne vérifie que authorized_keys.
     *
     * @return la liste des fichiers authorized_keys trouvés
     */
    private List<Path> discoverAuthorizedKeysFiles() {
        List<Path> discovered = new ArrayList<>();

        // ── 1. Root (home spécial à /root, pas dans /home/) ─────
        addIfExists(discovered, Path.of("/root/.ssh/authorized_keys"));
        addIfExists(discovered, Path.of("/root/.ssh/authorized_keys2"));

        // ── 2. Tous les utilisateurs dans /home/ ────────────────
        Path homeDir = Path.of("/home");
        if (Files.isDirectory(homeDir)) {
            try (DirectoryStream<Path> users = Files.newDirectoryStream(homeDir)) {
                for (Path userHome : users) {
                    if (Files.isDirectory(userHome)) {
                        addIfExists(discovered, userHome.resolve(".ssh/authorized_keys"));
                        addIfExists(discovered, userHome.resolve(".ssh/authorized_keys2"));
                    }
                }
            } catch (IOException e) {
                System.err.println("[" + NAME + "] Cannot list /home/ : " + e.getMessage());
            }
        }

        return discovered;
    }

    // ═══════════════════════════════════════════════════════════
    //  UTILITAIRES DE DÉCOUVERTE
    // ═══════════════════════════════════════════════════════════

    /**
     * Liste tous les fichiers réguliers dans un dossier (non récursif).
     *
     * On ignore les fichiers cachés (commençant par ".") car les
     * fichiers cron légitimes n'ont pas de point en préfixe.
     * Certains éditeurs créent des fichiers temporaires comme
     * ".dpkg-new" qu'on ne veut pas surveiller.
     *
     * @param directory le dossier à lister
     * @return la liste des fichiers trouvés (vide si le dossier n'existe pas)
     */
    private List<Path> listFilesIn(Path directory) {
        List<Path> files = new ArrayList<>();

        if (!Files.isDirectory(directory)) {
            return files;
        }

        try (DirectoryStream<Path> stream = Files.newDirectoryStream(directory)) {
            for (Path entry : stream) {
                if (Files.isRegularFile(entry)
                        && !entry.getFileName().toString().startsWith(".")) {
                    files.add(entry);
                }
            }
        } catch (IOException e) {
            System.err.println("[" + NAME + "] Cannot list directory "
                    + directory + " : " + e.getMessage());
        }

        return files;
    }

    /**
     * Ajoute un chemin à la liste seulement s'il existe sur le disque.
     */
    private void addIfExists(List<Path> list, Path file) {
        if (Files.exists(file)) {
            list.add(file);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  CONSTRUCTION DE LA BASELINE
    // ═══════════════════════════════════════════════════════════

    private void buildBaseline() {
        baseline.clear();

        for (Path file : allWatchedFiles) {
            String hash = computeHash(file);
            if (hash != null) {
                baseline.put(file, hash);
                System.out.println("[" + NAME + "]   " + file + " → " + hash.substring(0, 16) + "...");
            } else {
                System.out.println("[" + NAME + "]   " + file + " → skipped (not readable)");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  VÉRIFICATION D'INTÉGRITÉ
    // ═══════════════════════════════════════════════════════════

    /**
     * Compare les hashes actuels avec la baseline.
     *
     * Grâce au refreshWatchedFiles() appelé juste avant, la liste
     * allWatchedFiles peut contenir de NOUVEAUX fichiers qui n'étaient
     * pas dans la baseline (ex: un authorized_keys créé entre deux cycles).
     * Le "Cas 2" détecte ces nouveaux fichiers et les ajoute à la baseline.
     */
    private void checkIntegrity() {

        for (Path file : allWatchedFiles) {
            String currentHash = computeHash(file);
            String baselineHash = baseline.get(file);

            // ── Cas 1 : fichier existait et existe encore ───────
            if (baselineHash != null && currentHash != null) {
                if (!baselineHash.equals(currentHash)) {
                    String payload = buildModifiedPayload(file, baselineHash, currentHash);
                    eventQueue.offer(new RawEvent(SOURCE_TYPE, payload));

                    System.err.println("[" + NAME + "] INTEGRITY VIOLATION : "
                            + file + " has been modified !");

                    baseline.put(file, currentHash);
                }
            }

            // ── Cas 2 : nouveau fichier détecté ─────────────────
            else if (baselineHash == null && currentHash != null) {
                String payload = buildCreatedPayload(file, currentHash);
                eventQueue.offer(new RawEvent(SOURCE_TYPE, payload));

                System.out.println("[" + NAME + "] New file detected : " + file);
                baseline.put(file, currentHash);
            }

            // ── Cas 3 : fichier supprimé ────────────────────────
            else if (baselineHash != null && currentHash == null) {
                String payload = buildDeletedPayload(file, baselineHash);
                eventQueue.offer(new RawEvent(SOURCE_TYPE, payload));

                System.err.println("[" + NAME + "] INTEGRITY VIOLATION : "
                        + file + " has been DELETED !");
                baseline.remove(file);
            }
        }

        // ── Cas spécial : fichiers orphelins dans la baseline ───
        // Un dossier home supprimé → son authorized_keys n'est plus
        // dans allWatchedFiles mais est encore dans la baseline.
        List<Path> orphans = new ArrayList<>();
        for (Path baselinePath : baseline.keySet()) {
            if (!allWatchedFiles.contains(baselinePath) && !Files.exists(baselinePath)) {
                orphans.add(baselinePath);
            }
        }
        for (Path orphan : orphans) {
            String payload = buildDeletedPayload(orphan, baseline.get(orphan));
            eventQueue.offer(new RawEvent(SOURCE_TYPE, payload));
            System.err.println("[" + NAME + "] INTEGRITY VIOLATION : "
                    + orphan + " has been DELETED !");
            baseline.remove(orphan);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  CALCUL DU HASH SHA-256
    // ═══════════════════════════════════════════════════════════

    private String computeHash(Path file) {
        if (!Files.isReadable(file)) {
            return null;
        }

        try {
            byte[] fileContent = Files.readAllBytes(file);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(fileContent);
            return HexFormat.of().formatHex(hashBytes);

        } catch (IOException e) {
            System.err.println("[" + NAME + "] Cannot read " + file + " : " + e.getMessage());
            return null;
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("[" + NAME + "] SHA-256 algorithm not available", e);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  CONSTRUCTION DES PAYLOADS
    // ═══════════════════════════════════════════════════════════

    private String buildModifiedPayload(Path file, String oldHash, String newHash) {
        return "action=MODIFIED"
                + " file=" + file
                + " old_hash=" + oldHash
                + " new_hash=" + newHash;
    }

    private String buildCreatedPayload(Path file, String currentHash) {
        return "action=CREATED"
                + " file=" + file
                + " hash=" + currentHash;
    }

    private String buildDeletedPayload(Path file, String lastKnownHash) {
        return "action=DELETED"
                + " file=" + file
                + " last_hash=" + lastKnownHash;
    }
}