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
 * Fichier typique :
 * ~/.warroom-agent/identity.json
 *
 * Ce composant est volontairement simple :
 * - lecture de l'identité si elle existe ;
 * - écriture de l'identité après enrôlement.
 */
public class AgentAuthStore {

    private final Path identityFile;
    private final ObjectMapper objectMapper;

    public AgentAuthStore(Path identityFile, ObjectMapper objectMapper) {
        this.identityFile = identityFile;
        this.objectMapper = objectMapper;
    }

    public Optional<AgentIdentity> loadIdentity() {
        try {
            if (!Files.exists(identityFile)) {
                return Optional.empty();
            }

            AgentIdentity identity = objectMapper.readValue(identityFile.toFile(), AgentIdentity.class);
            return Optional.of(identity);
        } catch (IOException e) {
            throw new IllegalStateException("Impossible to read local identity : " + identityFile, e);
        }
    }

    public void saveIdentity(AgentIdentity identity) {
        try {
            Files.createDirectories(identityFile.getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(identityFile.toFile(), identity);
        } catch (IOException e) {
            throw new IllegalStateException("Impossible to write local identity : " + identityFile, e);
        }
    }
}