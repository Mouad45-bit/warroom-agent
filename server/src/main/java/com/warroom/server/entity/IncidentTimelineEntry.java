package com.warroom.server.entity;

import com.warroom.server.model.IncidentStatus;
import com.warroom.server.model.TimelineEntryType;
import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "incident_timeline")
public class IncidentTimelineEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long incidentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TimelineEntryType entryType;

    @Column(nullable = false)
    private Long authorUserId;

    private String authorFullName;
    private String authorRole;

    @Column(columnDefinition = "TEXT")
    private String content;

    // Pour STATUS_CHANGE : ancien et nouveau statut
    @Enumerated(EnumType.STRING)
    private IncidentStatus oldStatus;

    @Enumerated(EnumType.STRING)
    private IncidentStatus newStatus;

    @Column(nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}