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
public class SyslogAnalyzer implements EventAnalyzer {

    @Override
    public String supportedSourceType() {
        return "linux.syslog";
    }

    @Override
    public List<AlertRecord> analyze(SecurityEvent event) {
        List<AlertRecord> alerts = new ArrayList<>();
        String payload = event.getPayload();

        if (payload == null || payload.isEmpty()) return alerts;

        // Règle 1 : Tâche planifiée suspecte (Exécution depuis /tmp ou téléchargement)
        if (payload.contains("CRON") && (payload.contains("/tmp/") || payload.contains("wget") || payload.contains("curl") || payload.contains("nc "))) {
            alerts.add(buildAlert(event, Severity.HIGH, "Tâche CRON suspecte (téléchargement ou exécution depuis /tmp) : " + payload));
        }
        // Règle 2 : Arrêt d'un service de sécurité système
        else if (payload.contains("systemd") && payload.contains("Stopped") &&
                (payload.contains("auditd") || payload.contains("ufw") || payload.contains("apparmor") || payload.contains("fail2ban"))) {
            alerts.add(buildAlert(event, Severity.MEDIUM, "Un service de sécurité critique a été arrêté."));
        }
        // Règle 3 : OOM Killer (Souvent causé par un cryptomineur qui sature la RAM)
        else if (payload.contains("Out of memory: Killed process")) {
            alerts.add(buildAlert(event, Severity.LOW, "OOM Killer déclenché (Surcharge de la mémoire RAM détectée)."));
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