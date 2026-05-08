package com.warroom.agent.kernel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.warroom.agent.kernel.bootstrap.AgentBootstrap;
import com.warroom.agent.kernel.config.AgentConfigManager;
import com.warroom.agent.kernel.enrollment.AgentEnrollmentClient;
import com.warroom.agent.kernel.heartbeat.HealthReporter;
import com.warroom.agent.kernel.heartbeat.HeartbeatService;
import com.warroom.agent.kernel.identity.AgentAuthStore;
import com.warroom.agent.kernel.identity.AgentStateStore;
import com.warroom.agent.kernel.supervisor.AgentSupervisor;
import com.warroom.agent.kernel.supervisor.CollectorRegistry;
import com.warroom.agent.transmission.LocalEventQueue;
import com.warroom.agent.transmission.EventBatcher;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.CountDownLatch;

/**
 * Point d'entrée principal de l'agent.
 *
 * Ce fichier agit comme le "Composition Root" (Racine de composition).
 * Sa seule responsabilité est de construire l'arbre des dépendances :
 * il instancie toutes les briques logicielles, les connecte entre elles,
 * puis lance le moteur.
 */
public final class AgentApplication {

    // Constructeur privé : empêche l'instanciation de cette classe avec "new AgentApplication()".
    // C'est une bonne pratique pour les classes qui ne contiennent que des méthodes statiques (comme le main).
    private AgentApplication() {
    }

    // Le "throws Exception" permet de faire crasher l'agent immédiatement au démarrage
    // si une ressource critique (ex: droits sur le dossier) est inaccessible.
    public static void main(String[] args) throws Exception {

        // =====================================================================
        // 1. PRÉPARATION DE L'ENVIRONNEMENT LOCAL
        // =====================================================================

        // Définit le chemin du répertoire de travail dans le dossier personnel de l'utilisateur de l'OS
        // (ex: /home/nom/.warroom-agent).
        Path workDir = Paths.get(System.getProperty("user.home"), ".warroom-agent");

        // Crée le dossier physiquement sur le disque dur s'il n'existe pas déjà.
        Files.createDirectories(workDir);

        // Instancie Jackson, le moteur qui va convertir les objets Java en texte JSON
        // (pour le réseau et pour la sauvegarde sur disque) et vice-versa.
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();


        // =====================================================================
        // 2. CRÉATION DES MAGASINS DE DONNÉES (STORES)
        // =====================================================================

        // Gère l'identité de l'agent (ID, clé API). Il va lire/écrire dans le fichier "identity.json".
        AgentAuthStore authStore = new AgentAuthStore(workDir.resolve("identity.json"), objectMapper);

        // La "mémoire vive" de l'agent. Conserve les compteurs de performance, les erreurs,
        // et le statut d'exécution. Ce store n'écrit rien sur le disque.
        AgentStateStore stateStore = new AgentStateStore();


        // =====================================================================
        // 3. RÉSEAU ET CONFIGURATION
        // =====================================================================

        // Le client HTTP qui permet de discuter avec le serveur backend Spring Boot.
        AgentEnrollmentClient enrollmentClient =
                new AgentEnrollmentClient("http://localhost:8080", objectMapper);

        // Gère la configuration dynamique (intervalle de heartbeat, taille des lots, etc.).
        // Il essaiera de la lire depuis le serveur, sinon depuis son cache local ("config-cache.json").
        AgentConfigManager configManager =
                new AgentConfigManager(
                        workDir.resolve("config-cache.json"),
                        objectMapper,
                        enrollmentClient,
                        authStore
                );


        // =====================================================================
        // 4. TRANSMISSION DES ÉVÉNEMENTS (LOGS/ALERTES)
        // =====================================================================

        // Création d'un "buffer" (une salle d'attente) pour les événements récoltés.
        // Si l'agent n'a pas de réseau, les événements s'accumulent ici.
        LocalEventQueue eventQueue = new LocalEventQueue(stateStore);

        // --- INJECTION DE TEST TEMPORAIRE ---
        // Simule un événement de sécurité pour tester la chaîne d'envoi de bout en bout.
        eventQueue.offer(new com.warroom.agent.transmission.model.RawEvent(
                "test.system",
                "Alert manually generated to test end-to-end transmission !"
        ));
        // ------------------------------------


        // =====================================================================
        // 5. SUPERVISION DES COLLECTEURS (LES "OUVRIERS")
        // =====================================================================

        // Un catalogue qui contiendra la liste des collecteurs disponibles.
        CollectorRegistry collectorRegistry = new CollectorRegistry(eventQueue);

        // Le "manager" qui va allumer, éteindre et surveiller les collecteurs.
        // S'il détecte qu'un collecteur a planté, il le redémarrera.
        AgentSupervisor supervisor = new AgentSupervisor(collectorRegistry.registeredComponents(), stateStore);


        // =====================================================================
        // 6. SERVICES DE FOND (BACKGROUND TASKS)
        // =====================================================================

        // Un composant qui va lire l'état du superviseur et les compteurs pour générer un bilan de santé.
        HealthReporter healthReporter = new HealthReporter(supervisor, stateStore);

        // Un service qui tournera en boucle pour envoyer le bilan de santé au serveur à intervalles réguliers.
        HeartbeatService heartbeatService =
                new HeartbeatService(authStore, configManager, healthReporter, enrollmentClient, stateStore);

        // Le livreur : il pioche les événements en attente dans la queue, les regroupe (batch)
        // et les envoie au serveur.
        EventBatcher batcher = new EventBatcher(eventQueue, enrollmentClient, authStore, configManager, stateStore);


        // =====================================================================
        // 7. ORCHESTRATION ET DÉMARRAGE
        // =====================================================================

        // Le chef d'orchestre final. On lui donne tous les composants clés créés ci-dessus.
        // Son rôle sera de lancer la séquence dans le bon ordre (s'enrôler -> charger la config -> démarrer les services).
        AgentBootstrap bootstrap =
                new AgentBootstrap(
                        authStore,
                        enrollmentClient,
                        configManager,
                        supervisor,
                        heartbeatService,
                        stateStore,
                        batcher
                );

        // =====================================================================
        // 8. GESTION DU CYCLE DE VIE
        // =====================================================================

        // Ce bloc de code ("Shutdown Hook") est enregistré dans la machine virtuelle Java (JVM).
        // Il s'exécutera automatiquement SI l'utilisateur fait "Ctrl+C" dans le terminal ou si l'OS tue le processus.
        // Cela permet d'appeler bootstrap.stop() pour fermer proprement les connexions réseau et sauvegarder les données.
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("[Agent] Shutdown hook triggered.");
            bootstrap.stop();
        }));

        // Démarrage effectif de toute la machinerie.
        bootstrap.start();

        // Une fois bootstrap.start() exécuté, les tâches tournent dans des threads d'arrière-plan.
        // Si le thread principal (le main) arrive à la fin du fichier, Java coupe le programme.
        // CountDownLatch(1).await() agit comme un mur : il bloque le thread principal indéfiniment,
        // ce qui permet à l'agent de tourner en continu (comme un vrai service système).
        new CountDownLatch(1).await();
    }
}