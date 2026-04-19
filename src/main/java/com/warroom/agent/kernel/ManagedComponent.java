package com.warroom.agent.kernel;

/**
 * Interface commune pour tout composant géré par le supervisor.
 *
 * Plus tard :
 * - LogCollector
 * - SyscallCollector
 * - CommandCollector
 *
 * Tous implémenteront cette interface.
 */
public interface ManagedComponent {

    String name();

    void start(AgentConfig config);

    void stop();

    boolean isRunning();

    ComponentHealth health();
}