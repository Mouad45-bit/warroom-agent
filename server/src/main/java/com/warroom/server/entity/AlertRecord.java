package com.warroom.server.entity;

import com.warroom.server.model.AlertStatus;
import com.warroom.server.model.Severity;
import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;

import java.time.Instant;

@Data
@Entity
@Table(name = "alert_records")
public class AlertRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long eventId;
    private String ruleId;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private Agent agent;

    @Enumerated(EnumType.STRING)
    private Severity severity;

    @Enumerated(EnumType.STRING)
    private AlertStatus status;        // ← remplace acknowledged

    private String message;
    private Instant createdAt;

    // --- Champs humains (remplis par le L1 via l'API) ---
    private Long qualifiedByUserId;    // ID du L1 qui a traité
    private Instant qualifiedAt;       // Horodatage du traitement

    @Column(columnDefinition = "TEXT")
    private String justification;      // Obligatoire pour FALSE_POSITIVE

    private Long incidentId;           // Lien vers l'incident (Module 2)
}