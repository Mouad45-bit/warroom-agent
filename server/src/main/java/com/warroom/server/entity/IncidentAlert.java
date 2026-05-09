package com.warroom.server.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "incident_alerts", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"incident_id", "alert_id"})
})
public class IncidentAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "incident_id", nullable = false)
    private Long incidentId;

    @Column(name = "alert_id", nullable = false)
    private Long alertId;

    public IncidentAlert(Long incidentId, Long alertId) {
        this.incidentId = incidentId;
        this.alertId = alertId;
    }
}