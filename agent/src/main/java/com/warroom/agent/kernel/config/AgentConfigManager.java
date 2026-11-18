package com.warroom.agent.kernel.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.warroom.agent.kernel.identity.AgentAuthStore;
import com.warroom.agent.kernel.enrollment.AgentEnrollmentClient;
import com.warroom.agent.kernel.model.AgentIdentity;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Gère la configuration active de l'agent.
 *
 * Stratégie de chargement :
 * - si possible, récupérer la config distante via le backend ;
 * - si échec, retomber sur le cache local ;
 * - si rien n'existe, utiliser une config par défaut.
 *
 * Ajout détection de changements :
 * - refreshConfig() compare l'ancienne config avec la nouvelle ;
 * - si elles diffèrent, tous les listeners enregistrés sont notifiés ;
 * - les listeners sont stockés dans une CopyOnWriteArrayList (thread-safe,
 *   peu d'écritures après le boot, lectures fréquentes à chaque refresh).
 */
public class AgentConfigManager {

    // =========================================================================
    // DÉPENDANCES
    // =========================================================================
    private final Path configCacheFile;                   // Chemin vers le fichier de secours local ("config-cache.json")
    private final ObjectMapper objectMapper;              // Outil de conversion JSON
    private final AgentEnrollmentClient enrollmentClient; // Client réseau pour interroger le serveur
    private final AgentAuthStore authStore;               // Pour lire l'identité (nécessaire pour s'authentifier au serveur)

    // "volatile" garantit que si le thread de mise à jour modifie cette config,
    // les autres threads (comme le Batcher) verront instantanément la nouvelle version en mémoire.
    // On l'initialise avec une configuration par défaut vide.
    private volatile AgentConfig activeConfig = new AgentConfig();

    /**
     * Liste des listeners notifiés lors d'un changement de configuration.
     *
     * CopyOnWriteArrayList car :
     * - les inscriptions se font au boot (rare) ;
     * - les itérations se font à chaque refresh (fréquent) ;
     * - thread-safe sans synchronized explicite sur la liste.
     */
    // C'est le cœur du design pattern "Observer". Ce tableau contient tous les composants
    // (Superviseur, Heartbeat) qui veulent être prévenus si la config change.
    // CopyOnWriteArrayList est une liste spéciale très performante pour la lecture concurrentielle.
    private final List<ConfigChangeListener> listeners = new CopyOnWriteArrayList<>();

    // Injection des dépendances via le constructeur
    public AgentConfigManager(
            Path configCacheFile,
            ObjectMapper objectMapper,
            AgentEnrollmentClient enrollmentClient,
            AgentAuthStore authStore
    ) {
        this.configCacheFile = configCacheFile;
        this.objectMapper = objectMapper;
        this.enrollmentClient = enrollmentClient;
        this.authStore = authStore;
    }

    /**
     * Inscrit un listener qui sera notifié à chaque changement de config.
     * Appelé par le Heartbeat et le Superviseur au démarrage*.
     */
    public void registerListener(ConfigChangeListener listener) {
        listeners.add(listener);
    }

    /**
     * Recharge la configuration active.
     *
     * Priorité :
     * 1. configuration distante si identité connue et backend disponible ;
     * 2. cache local si présent ;
     * 3. configuration par défaut sinon.
     *
     * Si la config chargée diffère de l'ancienne, les listeners sont notifiés.
     */
    // "synchronized" empêche deux rafraîchissements de se produire exactement en même temps,
    // ce qui pourrait corrompre la logique de comparaison entre l'ancienne et la nouvelle config.
    public synchronized AgentConfig refreshConfig() {
        // Étape 1 : télécharge ou lit la nouvelle configuration
        AgentConfig newConfig = loadConfig();

        // Étape 2 : On compare (nécessite que AgentConfig redéfinisse la méthode equals())
        if (!newConfig.equals(activeConfig)) {
            // Sauvegarde de l'ancienne pour l'envoyer aux listeners
            AgentConfig oldConfig = activeConfig;

            // Mise à jour de la config officielle
            this.activeConfig = newConfig;

            // Étape 3 : Filtre du premier démarrage (le fameux "faux positif")
            // Ne notifier que si oldConfig n'est pas la config par défaut initiale.
            // Au premier appel (boot), oldConfig est le défaut construit dans le champ,
            // et on ne veut pas déclencher de "changement" pour ça.
            if (oldConfig.getHeartbeatIntervalSeconds() != new AgentConfig().getHeartbeatIntervalSeconds()
                    || !oldConfig.getEnabledCollectors().isEmpty()) {

                // Si c'est un vrai changement en cours de route (Hot-Reload), on alerte tout le monde
                notifyListeners(oldConfig, newConfig);
            }
        } else {
            // Si la config est strictement identique à ce qu'on avait déjà,
            // on l'écrase par principe (sans impact) et on ne réveille aucun composant.
            this.activeConfig = newConfig;
        }

        return this.activeConfig;
    }

    // Permet aux composants de lire la configuration actuelle à tout moment
    public AgentConfig getActiveConfig() {
        return activeConfig;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Méthodes internes
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Charge la config selon la cascade remote → cache → défaut.
     * Méthode extraite de l'ancien refreshConfig() pour séparer
     * le chargement de la détection de changement.
     */
    // C'est ce qu'on appelle un pattern "Fallback" (Solution de repli en cascade).
    private AgentConfig loadConfig() {
        // 1. Tentative distante (le scénario idéal)
        try {
            AgentIdentity identity = authStore.loadIdentity().orElse(null);
            if (identity != null) {
                // Appel réseau
                AgentConfig remoteConfig = enrollmentClient.fetchRemoteConfig(identity);
                // Si ça réussit, on écrase immédiatement le cache local pour le garder à jour
                saveCache(remoteConfig);
                return remoteConfig;
            }
        } catch (Exception e) {
            // Si le serveur est mort ou le réseau coupé, on ne crashe pas. On logge juste l'erreur.
            System.err.println("[ConfigManager] Unable to load remote configuration : " + e.getMessage());
        }

        // 2. Cache local (le plan B : on a perdu internet mais on lit la dernière config connue)
        try {
            if (Files.exists(configCacheFile)) {
                return objectMapper.readValue(configCacheFile.toFile(), AgentConfig.class);
            }
        } catch (Exception e) {
            System.err.println("[ConfigManager] Unable to load local cache : " + e.getMessage());
        }

        // 3. Défaut (le plan C : pas d'internet et fichier local supprimé/corrompu)
        // On renvoie les configurations par défaut pour que l'agent ne plante pas.
        return new AgentConfig();
    }

    /**
     * Notifie chaque listener enregistré.
     * Les exceptions d'un listener ne bloquent pas les suivants.
     */
    private void notifyListeners(AgentConfig oldConfig, AgentConfig newConfig) {
        System.out.println("[ConfigManager] Configuration changed. Notifying "
                + listeners.size() + " listener(s).");
        System.out.println("[ConfigManager] old=" + oldConfig);
        System.out.println("[ConfigManager] new=" + newConfig);

        // On parcourt tous les composants inscrits (Heartbeat, Superviseur...)
        for (ConfigChangeListener listener : listeners) {
            try {
                // On leur donne l'ancienne ET la nouvelle config pour qu'ils puissent
                // calculer eux-mêmes ce qui a changé (ex: le Heartbeat ne regarde que l'intervalle).
                listener.onConfigChanged(oldConfig, newConfig);
            } catch (Exception e) {
                // Isolation des pannes (Fault Isolation) :
                // Si le Heartbeat crashe en lisant la config, ce try/catch empêche l'erreur
                // de stopper la boucle. Le Superviseur recevra quand même sa notification juste après !
                System.err.println("[ConfigManager] Listener notification failed : " + e.getMessage());
            }
        }
    }

    // Utilitaire pour écrire la configuration sur le disque
    private void saveCache(AgentConfig config) {
        try {
            // Sécurité : s'assure que le dossier parent ~/.warroom-agent/ existe bien
            Files.createDirectories(configCacheFile.getParent());
            // Écriture formatée (pretty printer) pour que l'humain puisse lire le JSON facilement
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(configCacheFile.toFile(), config);
        } catch (IOException e) {
            // Une erreur ici est critique car le cache est vital pour la résilience.
            throw new IllegalStateException("[ConfigManager] Unable to write configuration cache", e);
        }
    }
}