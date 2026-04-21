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
 * Rôle :
 * - préparer le répertoire de travail local ;
 * - instancier les composants du noyau ;
 * - démarrer le bootstrap ;
 * - garder le process vivant ;
 * - arrêter proprement l'agent à la fermeture.
 */
public final class AgentApplication {

    private AgentApplication() {
        // Classe utilitaire : pas d'instanciation.
    }

    public static void main(String[] args) throws Exception {
        // Répertoire local de l'agent.
        Path workDir = Paths.get(System.getProperty("user.home"), ".warroom-agent");
        Files.createDirectories(workDir);

        // Jackson nous servira à sérialiser/désérialiser le JSON local et distant.
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

        // Stockage local de l'identité de l'agent (agentId, token, etc.).
        AgentAuthStore authStore = new AgentAuthStore(workDir.resolve("identity.json"), objectMapper);

        // État runtime de l'agent (métriques simples, timestamps, backlog, etc.).
        AgentStateStore stateStore = new AgentStateStore();

        // Client HTTP vers le backend Spring Boot.
        AgentEnrollmentClient enrollmentClient =
                new AgentEnrollmentClient("http://localhost:8080", objectMapper);

        // Gestionnaire de configuration active.
        AgentConfigManager configManager =
                new AgentConfigManager(
                        workDir.resolve("config-cache.json"),
                        objectMapper,
                        enrollmentClient,
                        authStore
                );

        // Création de la file d'attente locale
        LocalEventQueue eventQueue = new LocalEventQueue(stateStore);

        // --- INJECTION DE TEST TEMPORAIRE ---
        // On simule le travail d'un collecteur qui trouverait une alerte
        eventQueue.offer(new com.warroom.agent.transmission.model.RawEvent(
                "test.system",
                "Alert manually generated to test end-to-end transmission !"
        ));
        // ------------------------------------

        // Registre des composants supervisés.
        // Pour l'instant il n'y a pas encore de collecteurs réels,
        // mais on garde déjà le point d'extension prêt.
        CollectorRegistry collectorRegistry = new CollectorRegistry(eventQueue);

        // Supervisor : démarre/arrête/surveille les composants.
        AgentSupervisor supervisor = new AgentSupervisor(collectorRegistry.registeredComponents(), stateStore);

        // Assemble la vue santé de l'agent.
        HealthReporter healthReporter = new HealthReporter(supervisor, stateStore);

        // Service heartbeat.
        HeartbeatService heartbeatService =
                new HeartbeatService(authStore, configManager, healthReporter, enrollmentClient, stateStore);

        // Création du Batcher (regroupeur/expéditeur)
        EventBatcher batcher = new EventBatcher(eventQueue, enrollmentClient, authStore, configManager, stateStore);

        // Bootstrap principal.
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

        // Hook d'arrêt propre.
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("[Agent] Shutdown hook triggered.");
            bootstrap.stop();
        }));

        // Démarrage de l'agent.
        bootstrap.start();

        // Empêche le main de quitter.
        new CountDownLatch(1).await();
    }
}