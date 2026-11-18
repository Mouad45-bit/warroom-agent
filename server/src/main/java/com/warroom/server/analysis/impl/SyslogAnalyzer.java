package com.warroom.server.analysis.impl;

import com.warroom.server.analysis.EventAnalyzer;
import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.SecurityEvent;
import com.warroom.server.model.AlertStatus;
import com.warroom.server.model.Severity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

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

        if (payload.contains("CRON") && (payload.contains("/tmp/") || payload.contains("wget") || payload.contains("curl") || payload.contains("nc "))) {
            alerts.add(buildAlert(event, "SYS-CRON-01", Severity.HIGH,
                    "Tâche CRON suspecte (téléchargement ou exécution depuis /tmp)"));
        } else if (payload.contains("systemd") && payload.contains("Stopped") &&
                (payload.contains("auditd") || payload.contains("ufw") || payload.contains("apparmor") || payload.contains("fail2ban"))) {
            alerts.add(buildAlert(event, "SYS-SVCSTOP-01", Severity.MEDIUM,
                    "Un service de sécurité critique a été arrêté."));
        } else if (payload.contains("Out of memory: Killed process")) {
            alerts.add(buildAlert(event, "SYS-OOM-01", Severity.LOW,
                    "OOM Killer déclenché (Surcharge mémoire RAM)."));
        }

        return alerts;
    }

    private AlertRecord buildAlert(SecurityEvent event, String ruleId, Severity severity, String message) {
        AlertRecord alert = new AlertRecord();
        alert.setAgent(event.getAgent());
        alert.setEventId(event.getId());
        alert.setRuleId(ruleId);
        alert.setSeverity(severity);
        alert.setMessage(message);
        alert.setCreatedAt(Instant.now());
        alert.setStatus(AlertStatus.NEW);
        return alert;
    }
}