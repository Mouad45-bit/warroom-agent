package com.warroom.agent.kernel.bootstrap;

import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.kernel.config.AgentConfigManager;
import com.warroom.agent.kernel.enrollment.AgentEnrollmentClient;
import com.warroom.agent.kernel.heartbeat.HeartbeatService;
import com.warroom.agent.kernel.identity.AgentAuthStore;
import com.warroom.agent.kernel.identity.AgentStateStore;
import com.warroom.agent.kernel.model.AgentIdentity;
import com.warroom.agent.kernel.resilience.RetryExecutor;
import com.warroom.agent.kernel.resilience.RetryPolicy;
import com.warroom.agent.kernel.supervisor.AgentSupervisor;
import com.warroom.agent.transmission.EventBatcher;

import java.net.InetAddress;
import java.time.Instant;
import java.util.Optional;

/**
 * Coordonne la séquence complète de démarrage de l'agent.
 *
 * Stratégie de résilience :
 * - Phase 1 : résoudre l'identité (disque → enrollment avec retry) ;
 * - Phase 2 : charger la configuration (remote → cache → défaut) ;
 * - Phase 3 : démarrer les composants (toujours, même sans identité) ;
 * - Phase 4 : si pas d'identité, lancer un enrollment en arrière-plan.
 *
 * L'agent ne crashe jamais au boot.
 * Le heartbeat et le batcher vérifient l'identité à chaque tick,
 * donc dès qu'elle apparaît, tout s'active automatiquement.
 */
public class AgentBootstrap {

    private final AgentAuthStore authStore;
    private final AgentEnrollmentClient enrollmentClient;
    private final AgentConfigManager configManager;
    private final AgentSupervisor supervisor;
    private final HeartbeatService heartbeatService;
    private final AgentStateStore stateStore;
    private final EventBatcher batcher;

    private volatile boolean started = false;

    /** Thread daemon pour l'enrollment en arrière-plan. */
    private volatile Thread backgroundEnrollmentThread;

    public AgentBootstrap(
            AgentAuthStore authStore,
            AgentEnrollmentClient enrollmentClient,
            AgentConfigManager configManager,
            AgentSupervisor supervisor,
            HeartbeatService heartbeatService,
            AgentStateStore stateStore,
            EventBatcher batcher
    ) {
        this.authStore = authStore;
        this.enrollmentClient = enrollmentClient;
        this.configManager = configManager;
        this.supervisor = supervisor;
        this.heartbeatService = heartbeatService;
        this.stateStore = stateStore;
        this.batcher = batcher;
    }

    /**
     * Lance toute la séquence de démarrage.
     * Ne lève jamais d'exception — l'agent démarre toujours,
     * en mode normal ou dégradé.
     */
    public synchronized void start() {
        if (started) {
            System.out.println("[AgentBootstrap] Agent already started.");
            return;
        }

        stateStore.markAgentStartedAt(Instant.now());

        // ── Phase 1 : résolution de l'identité ──────────────────────────
        AgentIdentity identity = resolveIdentity();

        if (identity != null) {
            stateStore.markLastKnownIdentity(identity.agentId());
            System.out.println("[AgentBootstrap] Identity ready. agentId=" + identity.agentId());
        } else {
            System.out.println("[AgentBootstrap] No identity available. Starting in degraded mode.");
        }

        // ── Phase 2 : configuration ─────────────────────────────────────
        AgentConfig config = configManager.refreshConfig();
        System.out.println("[AgentBootstrap] Active configuration loaded : " + config);

        // ── Phase 3 : démarrer tous les composants ──────────────────────
        supervisor.startAll(config);
        batcher.start();
        heartbeatService.start();

        started = true;

        // ── Phase 4 : enrollment background si nécessaire ───────────────
        if (identity == null) {
            startBackgroundEnrollment();
        }

        System.out.println("[AgentBootstrap] Agent started successfully"
                + (identity == null ? " (degraded mode — enrollment pending)." : "."));
    }

    /**
     * Arrêt propre de l'agent.
     */
    public synchronized void stop() {
        stopBackgroundEnrollment();

        try {
            heartbeatService.stop();
        } catch (Exception e) {
            System.err.println("[AgentBootstrap] Heartbeat stop error : " + e.getMessage());
        }

        try {
            batcher.stop();
        } catch (Exception e) {
            System.err.println("[AgentBootstrap] Batcher stop error : " + e.getMessage());
        }

        try {
            supervisor.stopAll();
        } catch (Exception e) {
            System.err.println("[AgentBootstrap] Component shutdown error : " + e.getMessage());
        }

        started = false;
        System.out.println("[AgentBootstrap] Agent shutdown.");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Méthodes internes
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Tente de résoudre l'identité de l'agent.
     *
     * Priorité :
     * 1. identité locale (disque) ;
     * 2. enrollment au serveur avec retry rapide (RetryPolicy.boot()) ;
     * 3. null → l'agent démarre en mode dégradé.
     */
    private AgentIdentity resolveIdentity() {
        // 1. Tentative de chargement depuis le disque.
        AgentIdentity existing = authStore.loadIdentity().orElse(null);
        if (existing != null) {
            System.out.println("[AgentBootstrap] Existing identity loaded. agentId=" + existing.agentId());
            return existing;
        }

        System.out.println("[AgentBootstrap] No local identity. Attempting enrollment...");

        // 2. Enrollment avec retry rapide (boot policy : 5 tentatives, ~31s max).
        return RetryExecutor.execute(
                this::performEnrollment,
                RetryPolicy.boot(),
                "enrollment"
        ).orElse(null);
    }

    /**
     * Exécute un enrollment et persiste l'identité.
     * Appelé aussi bien par le boot que par le thread background.
     */
    private AgentIdentity performEnrollment() {
        try {
            String hostname = InetAddress.getLocalHost().getHostName();
            String osName = System.getProperty("os.name");
            String osVersion = System.getProperty("os.version");
            String agentVersion = "0.1.0";

            AgentIdentity identity = enrollmentClient.enroll(
                    hostname, osName, osVersion, agentVersion
            );

            authStore.saveIdentity(identity);
            return identity;
        } catch (Exception e) {
            throw new IllegalStateException("Enrollment failed : " + e.getMessage(), e);
        }
    }

    /**
     * Lance un thread daemon qui retente l'enrollment
     * via RetryExecutor avec la politique background (5s → 60s, infini).
     *
     * Dès que l'enrollment réussit :
     * - l'identité est sauvée sur disque ;
     * - le heartbeat et le batcher la trouvent au prochain tick ;
     * - la config est rafraîchie ;
     * - le thread meurt naturellement.
     */
    private void startBackgroundEnrollment() {
        backgroundEnrollmentThread = new Thread(() -> {
            Optional<AgentIdentity> result = RetryExecutor.execute(
                    this::performEnrollment,
                    RetryPolicy.background(),
                    "background-enrollment"
            );

            result.ifPresent(identity -> {
                stateStore.markLastKnownIdentity(identity.agentId());
                configManager.refreshConfig();
                System.out.println("[BackgroundEnrollment] Enrollment succeeded ! agentId="
                        + identity.agentId() + ". Agent is now fully operational.");
            });
        }, "agent-background-enrollment");

        backgroundEnrollmentThread.setDaemon(true);
        backgroundEnrollmentThread.start();

        System.out.println("[BackgroundEnrollment] Background enrollment started.");
    }

    private void stopBackgroundEnrollment() {
        if (backgroundEnrollmentThread != null && backgroundEnrollmentThread.isAlive()) {
            backgroundEnrollmentThread.interrupt();
            System.out.println("[BackgroundEnrollment] Background enrollment stopped.");
        }
    }
}