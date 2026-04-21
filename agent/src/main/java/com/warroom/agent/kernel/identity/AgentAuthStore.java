package com.warroom.agent.kernel.identity;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.warroom.agent.kernel.model.AgentIdentity;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

/**
 * Gère la persistance locale de l'identité agent.
 *
 * Ce composant a un rôle simple mais crucial : il évite à l'agent
 * de devoir s'enrôler (créer un nouvel ID sur le serveur) à chaque
 * fois que le service redémarre. Il lit et écrit l'identité sur le disque dur.
 *
 * Fichier typique :
 * ~/.warroom-agent/identity.json
 *
 * Ce composant est volontairement simple :
 * - lecture de l'identité si elle existe ;
 * - écriture de l'identité après enrôlement.
 */
public class AgentAuthStore {

    // =========================================================================
    // DÉPENDANCES ET VARIABLES D'ÉTAT
    // =========================================================================

    // Représente le chemin absolu vers le fichier "identity.json" sur la machine hôte.
    private final Path identityFile;

    // L'outil de la librairie Jackson qui permet de transformer un objet Java en texte JSON, et inversement.
    private final ObjectMapper objectMapper;

    // Le constructeur reçoit ses dépendances depuis AgentApplication.
    // Cela permet de centraliser la configuration (ex: définir le chemin exact) à un seul endroit.
    public AgentAuthStore(Path identityFile, ObjectMapper objectMapper) {
        this.identityFile = identityFile;
        this.objectMapper = objectMapper;
    }

    // =========================================================================
    // LECTURE DE L'IDENTITÉ
    // =========================================================================

    /**
     * Tente de charger l'identité depuis le disque.
     *
     * L'utilisation de "Optional<AgentIdentity>" est une excellente pratique en Java.
     * Cela indique clairement à celui qui appelle cette méthode (le Bootstrap)
     * qu'il est tout à fait possible que l'identité n'existe pas encore (retour vide).
     */
    public Optional<AgentIdentity> loadIdentity() {
        try {
            // Étape 1 : Vérification de l'existence du fichier.
            // Si c'est la toute première fois que l'agent démarre, le fichier n'existe pas.
            // On retourne un Optional "vide" pour signaler qu'il faut s'enrôler.
            if (!Files.exists(identityFile)) {
                return Optional.empty();
            }

            // Étape 2 : Désérialisation.
            // Si le fichier existe, Jackson lit son contenu texte (JSON) et le transforme
            // automatiquement en un objet Java de type "AgentIdentity".
            AgentIdentity identity = objectMapper.readValue(identityFile.toFile(), AgentIdentity.class);

            // On enveloppe l'objet créé dans un Optional pour respecter la signature de la méthode.
            return Optional.of(identity);

        } catch (IOException e) {
            // Étape 3 : Gestion d'erreur.
            // Si le fichier existe mais qu'il est illisible (ex: problème de droits d'accès sous Linux,
            // ou fichier corrompu), on transforme l'erreur technique (IOException)
            // en une erreur logique (IllegalStateException) qui fera crasher l'agent proprement au démarrage.
            throw new IllegalStateException("[AgentAuthStore] Impossible to read local identity : " + identityFile, e);
        }
    }

    // =========================================================================
    // SAUVEGARDE DE L'IDENTITÉ
    // =========================================================================

    /**
     * Sauvegarde l'identité fraîchement reçue du serveur sur le disque dur.
     * Cette méthode est appelée juste après un enrôlement réussi.
     */
    public void saveIdentity(AgentIdentity identity) {
        try {
            // Étape 1 : Préparation du répertoire.
            // Avant de créer le fichier "identity.json", on s'assure que le dossier parent
            // (ex: ~/.warroom-agent/) existe bien. S'il n'existe pas, cette méthode le crée.
            // C'est une sécurité indispensable pour éviter une erreur d'écriture.
            Files.createDirectories(identityFile.getParent());

            // Étape 2 : Sérialisation et écriture.
            // "writerWithDefaultPrettyPrinter()" demande à Jackson d'écrire le JSON
            // avec des sauts de ligne et des indentations.
            // C'est inutile pour la machine, mais c'est très pratique pour un administrateur système
            // ou un développeur qui voudrait ouvrir le fichier texte pour le lire.
            // "writeValue" écrit l'objet "identity" dans le fichier ciblé.
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(identityFile.toFile(), identity);

        } catch (IOException e) {
            // Étape 3 : Gestion d'erreur.
            // Si l'écriture échoue (ex: disque plein, ou manque de permission d'écriture),
            // on lève une exception critique. L'agent ne peut pas fonctionner de manière
            // fiable s'il est amnésique à chaque redémarrage.
            throw new IllegalStateException("[AgentAuthStore] Impossible to write local identity : " + identityFile, e);
        }
    }
}