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

        if (payload.contains("key=\"warroom_module\"")) {
            alerts.add(buildAlert(event, "AUDIT-MOD-01", Severity.CRITICAL,
                    "Audit : Chargement de module noyau suspect."));
        } else if (payload.contains("key=\"warroom_inject\"") && !payload.contains("exe=\"/usr/bin/gdb\"")) {
            alerts.add(buildAlert(event, "AUDIT-INJECT-01", Severity.CRITICAL,
                    "Audit : Injection de mémoire (ptrace) détectée."));
        } else if (payload.contains("key=\"warroom_exec\"") && (payload.contains("exe=\"/usr/bin/wget\"") || payload.contains("exe=\"/usr/bin/curl\""))) {
            alerts.add(buildAlert(event, "AUDIT-DL-01", Severity.HIGH,
                    "Audit : Utilisation d'outils de téléchargement (wget/curl)."));
        } else if (payload.contains("key=\"warroom_privilege\"")) {
            alerts.add(buildAlert(event, "AUDIT-PRIV-01", Severity.CRITICAL,
                    "Audit : Modification suspecte des droits sudoers."));
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