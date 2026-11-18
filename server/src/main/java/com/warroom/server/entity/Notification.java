package com.warroom.server.entity;

import com.warroom.server.model.NotificationType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId; // Destinataire

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String message;

    private Long relatedIncidentId; // Lien vers l'incident (nullable)

    @Column(nullable = false)
    private boolean read = false;

    @Column(nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    public Notification(Long userId, NotificationType type, String message, Long relatedIncidentId) {
        this.userId = userId;
        this.type = type;
        this.message = message;
        this.relatedIncidentId = relatedIncidentId;
        this.read = false;
    }
}