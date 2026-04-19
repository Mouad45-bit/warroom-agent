package com.warroom.agent.kernel;

import java.net.InetAddress;
import java.time.Instant;

/**
 * Coordonne la séquence complète de démarrage de l'agent.
 *
 * Ordre de démarrage :
 * 1. charger ou créer l'identité agent ;
 * 2. enrôler l'agent si nécessaire ;
 * 3. récupérer la configuration active ;
 * 4. démarrer les composants supervisés ;
 * 5. démarrer le heartbeat.
 *
 * Ordre d'arrêt :
 * 1. arrêter le heartbeat ;
 * 2. arrêter les composants supervisés.
 */
public class AgentBootstrap {

    private final AgentAuthStore authStore;
    private final AgentEnrollmentClient enrollmentClient;
    private final AgentConfigManager configManager;
    private final AgentSupervisor supervisor;
    private final HeartbeatService heartbeatService;
    private final AgentStateStore stateStore;

    private volatile boolean started = false;

    public AgentBootstrap(
            AgentAuthStore authStore,
            AgentEnrollmentClient enrollmentClient,
            AgentConfigManager configManager,
            AgentSupervisor supervisor,
            HeartbeatService heartbeatService,
            AgentStateStore stateStore
    ) {
        this.authStore = authStore;
        this.enrollmentClient = enrollmentClient;
        this.configManager = configManager;
        this.supervisor = supervisor;
        this.heartbeatService = heartbeatService;
        this.stateStore = stateStore;
    }

    /**
     * Lance toute la séquence de démarrage.
     */
    public synchronized void start() {
        if (started) {
            System.out.println("[AgentBootstrap] Agent already started.");
            return;
        }

        try {
            AgentIdentity identity = authStore.loadIdentity().orElse(null);

            if (identity == null) {
                System.out.println("[AgentBootstrap] No local identity. Enrollment required.");

                String hostname = InetAddress.getLocalHost().getHostName();
                String osName = System.getProperty("os.name");
                String osVersion = System.getProperty("os.version");
                String agentVersion = "0.1.0";

                AgentIdentity enrolledIdentity = enrollmentClient.enroll(
                        hostname,
                        osName,
                        osVersion,
                        agentVersion
                );

                authStore.saveIdentity(enrolledIdentity);
                identity = enrolledIdentity;

                System.out.println("[AgentBootstrap] Agent successfully enlisted. agentId=" + identity.agentId());
            } else {
                System.out.println("[AgentBootstrap] Existing identity loaded. agentId=" + identity.agentId());
            }

            stateStore.markAgentStartedAt(Instant.now());
            stateStore.markLastKnownIdentity(identity.agentId());

            AgentConfig config = configManager.refreshConfig();
            System.out.println("[AgentBootstrap] Active configuration loaded : " + config);

            supervisor.startAll(config);

            heartbeatService.start();

            started = true;
            System.out.println("[AgentBootstrap] Agent started successfully.");
        } catch (Exception e) {
            System.err.println("[AgentBootstrap] Startup failed : " + e.getMessage());
            e.printStackTrace();
            stop();
            throw new IllegalStateException("Unable to start the agent", e);
        }
    }

    /**
     * Arrêt propre de l'agent.
     */
    public synchronized void stop() {
        try {
            heartbeatService.stop();
        } catch (Exception e) {
            System.err.println("[AgentBootstrap] Heartbeat stop error : " + e.getMessage());
        }

        try {
            supervisor.stopAll();
        } catch (Exception e) {
            System.err.println("[AgentBootstrap] Component shutdown error : " + e.getMessage());
        }

        started = false;
        System.out.println("[AgentBootstrap] Agent shutdown.");
    }
}