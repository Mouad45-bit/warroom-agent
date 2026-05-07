package com.warroom.server.entity;

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

    // 1. LE CHAMP MANQUANT : La traçabilité
    // Permet de relier cette alerte au log brut exact qui l'a déclenchée
    private Long eventId;

    private String ruleId;

    // 2. LE BOUCLIER LOMBOK
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private Agent agent;

    @Enumerated(EnumType.STRING)
    private Severity severity;

    private String message;
    private Instant createdAt;
    private boolean acknowledged;
}