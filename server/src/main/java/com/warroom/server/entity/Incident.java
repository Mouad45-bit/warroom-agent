package com.warroom.server.entity;

import com.warroom.server.model.IncidentStatus;
import com.warroom.server.model.Severity;
import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "incidents")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String incidentNumber; // INC-0001, INC-0002, ...

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentStatus status;

    // L2 assigné (null = pool L2, en attente de prise en charge)
    private Long assignedToUserId;

    // L1 qui a créé l'incident
    @Column(nullable = false)
    private Long createdByUserId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String triageNote; // Note initiale obligatoire du L1

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}