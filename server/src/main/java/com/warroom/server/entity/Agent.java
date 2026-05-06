package com.warroom.server.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "agents")
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
}