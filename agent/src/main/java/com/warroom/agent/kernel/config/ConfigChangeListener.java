package com.warroom.agent.kernel.config;

/**
 * Contrat pour tout composant qui veut être notifié
 * d'un changement de configuration active.
 *
 * Les deux configs (ancienne et nouvelle) sont passées
 * pour que le listener puisse déterminer précisément
 * ce qui a changé et décider s'il doit réagir.
 *
 * Exemple d'usage :
 *   configManager.registerListener((oldCfg, newCfg) -> {
 *       if (oldCfg.getHeartbeatIntervalSeconds() != newCfg.getHeartbeatIntervalSeconds()) {
 *           reschedule(newCfg.getHeartbeatIntervalSeconds());
 *       }
 *   });
 */
@FunctionalInterface
public interface ConfigChangeListener {

    /**
     * Appelé par le ConfigManager quand la configuration active change.
     *
     * Important : cette méthode est appelée dans le thread du ConfigRefreshScheduler.
     * Les implémentations doivent être rapides et thread-safe.
     *
     * @param oldConfig l'ancienne configuration (jamais null)
     * @param newConfig la nouvelle configuration (jamais null, différente de oldConfig)
     */
    void onConfigChanged(AgentConfig oldConfig, AgentConfig newConfig);
}