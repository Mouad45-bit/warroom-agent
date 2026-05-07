package com.warroom.server.analysis.impl;

import com.warroom.server.analysis.EventAnalyzer;
import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.SecurityEvent;
import com.warroom.server.model.Severity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
//MVP
@Component
public class AuditAnalyzer implements EventAnalyzer {

    @Override
    public String supportedSourceType() {
        return "linux.audit";
    }

    @Override
    public List<AlertRecord> analyze(SecurityEvent event) {
        List<AlertRecord> alerts = new ArrayList<>();
        String payload = event.getPayload();

        if (payload == null || payload.isEmpty()) return alerts;

        // Règle 1 : Chargement de module Kernel via Audit
        if (payload.contains("key=\"warroom_module\"")) {
            alerts.add(buildAlert(event, Severity.CRITICAL, "Audit : Chargement de module noyau suspect."));
        }
        // Règle 2 : Injection de processus (ptrace) par un outil autre que le débugger normal (gdb)
        else if (payload.contains("key=\"warroom_inject\"") && !payload.contains("exe=\"/usr/bin/gdb\"")) {
            alerts.add(buildAlert(event, Severity.CRITICAL, "Audit : Injection de mémoire (ptrace) détectée."));
        }
        // Règle 3 : Téléchargement distant via ligne de commande
        else if (payload.contains("key=\"warroom_exec\"") && (payload.contains("exe=\"/usr/bin/wget\"") || payload.contains("exe=\"/usr/bin/curl\""))) {
            alerts.add(buildAlert(event, Severity.HIGH, "Audit : Utilisation d'outils de téléchargement (wget/curl)."));
        }
        // Règle 4 : Modification des privilèges sudo
        else if (payload.contains("key=\"warroom_privilege\"")) {
            alerts.add(buildAlert(event, Severity.CRITICAL, "Audit : Modification suspecte des droits sudoers."));
        }

        return alerts;
    }

    private AlertRecord buildAlert(SecurityEvent event, Severity severity, String message) {
        AlertRecord alert = new AlertRecord();
        alert.setAgent(event.getAgent());
        alert.setEventId(event.getId());
        alert.setSeverity(severity);
        alert.setMessage(message);
        alert.setCreatedAt(Instant.now());
        alert.setAcknowledged(false);
        return alert;
    }
}