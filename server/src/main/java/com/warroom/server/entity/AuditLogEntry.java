package com.warroom.server.entity;

import com.warroom.server.model.AuditAction;
import com.warroom.server.model.AuditTargetType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@Entity
@Table(name = "audit_log")
public class AuditLogEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;           // Qui a fait l'action
    private String userFullName;
    private String userRole;       // "L1", "L2", "MANAGER", "ADMIN"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction actionType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditTargetType targetType;

    private String targetId;       // ID de la cible (string car agentId est un string)
    private String targetLabel;    // Label lisible ("INC-0001", "srv-web-01", "ahmed.l1")

    @Column(columnDefinition = "TEXT")
    private String details;        // Détails additionnels (diff config, justification, etc.)

    @Column(nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}