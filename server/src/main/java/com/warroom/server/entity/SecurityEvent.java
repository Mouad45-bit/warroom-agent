package com.warroom.server.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "security_events")
public class SecurityEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Lien avec la table agents (Un agent a plusieurs événements)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private Agent agent;

    private String sourceType; // ex: "linux.auth.log"
    private Instant collectedAt; // Quand le capteur l'a vu
    private Instant receivedAt;  // Quand le serveur l'a reçu

    @Column(columnDefinition = "TEXT") // TEXT car un log peut être très long
    private String payload;
}