package com.warroom.agent.kernel.supervisor;

import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.kernel.config.ConfigChangeListener;
import com.warroom.agent.kernel.model.ComponentHealth;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Démarre, arrête et surveille les composants gérés par l'agent.
 *
 * Responsabilités :
 * - démarrer les composants activés dans la config ;
 * - surveiller leur santé en continu via un watchdog ;
 * - redémarrer automatiquement les composants tombés (backoff exponentiel) ;
 * - mettre en quarantaine les composants qui crashent trop souvent ;
 * - réagir aux changements de config pour activer/désactiver des composants.
 *
 * Implémente ConfigChangeListener pour réagir aux changements
 * de enabledCollectors poussés depuis le serveur.
 */
public class AgentSupervisor implements ConfigChangeListener {

    /** Fréquence du watchdog — compromis entre réactivité et charge CPU. */
    private static final int WATCHDOG_INTERVAL_SECONDS = 10;

    /** Tous les composants connus, indexés par leur name(). */
    private final Map<String, ManagedComponent> components = new HashMap<>();

    /** État runtime de chaque composant. */
    private final Map<String, ComponentState> states = new HashMap<>();

    /** Dernière config vue (pour savoir quels composants doivent tourner). */
    private volatile AgentConfig currentConfig;

    /** Thread daemon du watchdog. */
    private ScheduledExecutorService watchdog;
    private volatile boolean started = false;

    public AgentSupervisor(List<ManagedComponent> components) {
        for (ManagedComponent component : components) {
            this.components.put(component.name(), component);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  API publique : démarrage, arrêt, état
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Démarre tous les composants activés dans la config, puis le watchdog.
     */
    public synchronized void startAll(AgentConfig config) {
        if (started) {
            return;
        }

        this.currentConfig = config;
        Set<String> enabled = new HashSet<>(config.getEnabledCollectors());

        // Initialiser l'état de chaque composant connu.
        for (String name : components.keySet()) {
            ComponentStatus initialStatus = enabled.contains(name)
                    ? ComponentStatus.RUNNING   // sera ajusté à CRASHED si le start échoue
                    : ComponentStatus.DISABLED;
            states.put(name, new ComponentState(name, initialStatus));
        }

        // Démarrer uniquement les composants activés.
        for (String name : enabled) {
            ManagedComponent component = components.get(name);
            if (component != null) {
                tryStart(component);
            } else {
                System.err.println("[Supervisor] Unknown component in enabledCollectors : " + name);
            }
        }

        startWatchdog();
        started = true;
    }

    /**
     * Arrête tous les composants et le watchdog.
     */
    public synchronized void stopAll() {
        stopWatchdog();

        for (ManagedComponent component : components.values()) {
            ComponentState state = states.get(component.name());
            if (state != null && state.status() == ComponentStatus.RUNNING) {
                tryStop(component);
            }
        }

        started = false;
    }

    /**
     * Construit la vue santé pour le heartbeat.
     */
    public synchronized List<ComponentHealth> healthSnapshot() {
        List<ComponentHealth> result = new ArrayList<>();

        for (ManagedComponent component : components.values()) {
            ComponentState state = states.get(component.name());
            if (state == null) {
                continue;
            }

            String statusMessage = buildStatusMessage(state);
            boolean running = state.status() == ComponentStatus.RUNNING;
            result.add(new ComponentHealth(component.name(), running, statusMessage));
        }

        return Collections.unmodifiableList(result);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ConfigChangeListener : hot-reload des collecteurs
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Réagit à un changement de enabledCollectors.
     *
     * Calcule le diff entre l'ancienne et la nouvelle liste :
     * - nouveaux composants à démarrer ;
     * - composants à arrêter (passer en DISABLED).
     *
     * Les composants QUARANTINED restent dans cet état même s'ils
     * sont toujours dans enabledCollectors : la quarantaine est
     * une décision du supervisor, pas de la config.
     */
    @Override
    public synchronized void onConfigChanged(AgentConfig oldConfig, AgentConfig newConfig) {
        this.currentConfig = newConfig;

        Set<String> oldEnabled = new HashSet<>(oldConfig.getEnabledCollectors());
        Set<String> newEnabled = new HashSet<>(newConfig.getEnabledCollectors());

        // Composants à démarrer : dans newEnabled mais pas dans oldEnabled.
        Set<String> toStart = new HashSet<>(newEnabled);
        toStart.removeAll(oldEnabled);

        // Composants à arrêter : dans oldEnabled mais pas dans newEnabled.
        Set<String> toStop = new HashSet<>(oldEnabled);
        toStop.removeAll(newEnabled);

        for (String name : toStart) {
            ManagedComponent component = components.get(name);
            ComponentState state = states.get(name);

            if (component == null) {
                System.err.println("[Supervisor] Config requests unknown component : " + name);
                continue;
            }

            // Si on ne connaissait pas ce composant (jamais vu), on crée son état.
            if (state == null) {
                state = new ComponentState(name, ComponentStatus.RUNNING);
                states.put(name, state);
            } else if (state.status() == ComponentStatus.QUARANTINED) {
                System.out.println("[Supervisor] " + name
                        + " requested by config but quarantined. Skipping.");
                continue;
            } else {
                state.setStatus(ComponentStatus.RUNNING);
            }

            System.out.println("[Supervisor] Hot-reload : starting " + name);
            tryStart(component);
        }

        for (String name : toStop) {
            ManagedComponent component = components.get(name);
            ComponentState state = states.get(name);

            if (component == null || state == null) {
                continue;
            }

            if (state.status() == ComponentStatus.RUNNING) {
                System.out.println("[Supervisor] Hot-reload : stopping " + name);
                tryStop(component);
            }
            state.setStatus(ComponentStatus.DISABLED);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Watchdog : détection de crash et redémarrage
    // ═══════════════════════════════════════════════════════════════════

    private void startWatchdog() {
        watchdog = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "agent-supervisor-watchdog");
            t.setDaemon(true);
            return t;
        });

        watchdog.scheduleWithFixedDelay(
                this::watchdogTick,
                WATCHDOG_INTERVAL_SECONDS,
                WATCHDOG_INTERVAL_SECONDS,
                TimeUnit.SECONDS
        );

        System.out.println("[Supervisor] Watchdog started. interval=" + WATCHDOG_INTERVAL_SECONDS + "s");
    }

    private void stopWatchdog() {
        if (watchdog != null) {
            watchdog.shutdownNow();
            System.out.println("[Supervisor] Watchdog stopped.");
        }
    }

    /**
     * Un tick du watchdog.
     *
     * Parcourt tous les composants et traite trois cas :
     * - RUNNING mais isRunning() = false → le composant est tombé silencieusement ;
     * - CRASHED et délai de backoff écoulé → tenter un redémarrage ;
     * - QUARANTINED → rien à faire.
     */
    private synchronized void watchdogTick() {
        for (Map.Entry<String, ManagedComponent> entry : components.entrySet()) {
            ManagedComponent component = entry.getValue();
            ComponentState state = states.get(entry.getKey());

            if (state == null) {
                continue;
            }

            try {
                if (state.status() == ComponentStatus.RUNNING && !component.isRunning()) {
                    // Crash silencieux détecté.
                    System.err.println("[Watchdog] " + component.name() + " is not running anymore.");
                    state.recordCrash("Detected as not running by watchdog");
                } else if (state.isReadyToRestart()) {
                    // Délai de backoff écoulé : on retente.
                    state.markRestartAttempt();
                    tryStart(component);
                }
            } catch (Exception e) {
                System.err.println("[Watchdog] Error while checking " + component.name()
                        + " : " + e.getMessage());
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Helpers : tentatives start/stop avec gestion d'état
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Tente de démarrer un composant.
     * Succès → état RUNNING, compteurs reset.
     * Échec → enregistre le crash, planifie un redémarrage (ou quarantaine).
     */
    private void tryStart(ManagedComponent component) {
        ComponentState state = states.get(component.name());
        if (state == null) {
            return;
        }

        try {
            component.start(currentConfig);
            state.recordRestartSuccess();
            System.out.println("[Supervisor] Component started : " + component.name());
        } catch (Exception e) {
            System.err.println("[Supervisor] Failed to start " + component.name()
                    + " : " + e.getMessage());
            state.recordCrash(e.getMessage());
        }
    }

    private void tryStop(ManagedComponent component) {
        try {
            component.stop();
            System.out.println("[Supervisor] Component stopped : " + component.name());
        } catch (Exception e) {
            System.err.println("[Supervisor] Component shutdown failed "
                    + component.name() + " : " + e.getMessage());
        }
    }

    /**
     * Construit un message lisible pour la santé remontée au serveur.
     */
    private String buildStatusMessage(ComponentState state) {
        return switch (state.status()) {
            case RUNNING     -> "running";
            case CRASHED     -> "crashed, awaiting restart : "
                    + (state.lastErrorMessage() != null
                    ? state.lastErrorMessage() : "unknown error");
            case QUARANTINED -> "quarantined after repeated crashes : "
                    + (state.lastErrorMessage() != null
                    ? state.lastErrorMessage() : "unknown error");
            case DISABLED    -> "disabled by configuration";
        };
    }
}