package com.warroom.server.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "agents")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Agent {

    @Id // La clé primaire (ex: agt-a1b2c3d4)
    private String agentId;

    private String apiKey;
    private String hostname;
    private String osName;
    private String osVersion;
    private String agentVersion;

    private Instant enrolledAt;
    private Instant lastSeenAt; // Mis à jour à chaque Heartbeat

    private int heartbeatIntervalSeconds = 30; // Valeur par défaut
    private int batchSize = 100;               // Valeur par défaut
    private int retryIntervalSeconds = 10;     // Valeur par défaut

    // @ElementCollection crée automatiquement une table de liaison "agent_enabled_collectors"
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "agent_enabled_collectors", joinColumns = @JoinColumn(name = "agent_id"))
    @Column(name = "collector_name")
    private List<String> enabledCollectors = List.of(
            "LogCollector",
            "NetworkCollector",
            "ProcessCollector",
            "FileIntegrityCollector"
    );
}