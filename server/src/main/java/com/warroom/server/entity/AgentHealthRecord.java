package com.warroom.server.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "agent_health_records")
public class AgentHealthRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private Agent agent;

    private Instant timestamp;
    private boolean isRunning;

    // --- NOUVELLES MÉTRIQUES (Pour les graphiques du Dashboard) ---
    private long queuedEvents;
    private long deliveredEvents;
    private long failedBatches;
    private long droppedEvents;
    private long enrollmentRetries;
    private long configRefreshFailures;
    private long componentRestarts;

    // On garde ce champ TEXT pour stocker la liste des états des collecteurs (ComponentHealth)
    @Column(columnDefinition = "TEXT")
    private String snapshotData;
}