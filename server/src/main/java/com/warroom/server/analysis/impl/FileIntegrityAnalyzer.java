package com.warroom.server.analysis.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.warroom.server.analysis.EventAnalyzer;
import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.SecurityEvent;
import com.warroom.server.model.AlertStatus;
import com.warroom.server.model.Severity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class FileIntegrityAnalyzer implements EventAnalyzer {

    private final ObjectMapper objectMapper;

    public FileIntegrityAnalyzer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String supportedSourceType() {
        return "file.integrity";
    }

    @Override
    public List<AlertRecord> analyze(SecurityEvent event) {
        List<AlertRecord> alerts = new ArrayList<>();
        String payload = event.getPayload();

        if (payload == null || payload.isEmpty()) return alerts;

        Map<String, String> fields;
        try {
            fields = objectMapper.readValue(payload, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            fields = parseLegacyPayload(payload);
        }

        String action = fields.get("action");
        String file = fields.get("file");

        if (action == null || file == null) return alerts;

        Severity detectedSeverity = null;
        String alertMessage = null;
        String ruleId = null;

        if (file.equals("/etc/shadow") || file.equals("/etc/sudoers")) {
            if ("MODIFIED".equals(action) || "DELETED".equals(action)) {
                detectedSeverity = Severity.CRITICAL;
                ruleId = "FIM-VITAL-01";
                alertMessage = "Fichier système vital altéré (" + file + ") - Action : " + action;
            }
        } else if (file.equals("/etc/passwd")) {
            if ("MODIFIED".equals(action) || "DELETED".equals(action)) {
                detectedSeverity = Severity.CRITICAL;
                ruleId = "FIM-PASSWD-01";
                alertMessage = "Modification ou Suppression de /etc/passwd (Backdoor ou Déni de service)";
            }
        } else if (file.equals("/etc/ssh/sshd_config")) {
            if ("MODIFIED".equals(action) || "DELETED".equals(action)) {
                detectedSeverity = Severity.HIGH;
                ruleId = "FIM-SSH-01";
                alertMessage = "Configuration du serveur SSH modifiée ou supprimée";
            }
        } else if (file.equals("/etc/crontab") || file.startsWith("/var/spool/cron/crontabs/")) {
            if ("MODIFIED".equals(action) || "DELETED".equals(action)) {
                detectedSeverity = Severity.HIGH;
                ruleId = "FIM-CRON-01";
                alertMessage = "Tâche planifiée globale altérée (Fichier : " + file + ")";
            }
        } else if (file.startsWith("/etc/cron.d/") && "CREATED".equals(action)) {
            detectedSeverity = Severity.HIGH;
            ruleId = "FIM-CRON-02";
            alertMessage = "Nouvelle tâche planifiée système créée (Persistance suspectée)";
        } else if (file.endsWith("/authorized_keys") || file.endsWith("/authorized_keys2")) {
            if ("MODIFIED".equals(action) || "CREATED".equals(action)) {
                detectedSeverity = Severity.HIGH;
                ruleId = "FIM-SSHKEY-01";
                alertMessage = "Clé SSH ajoutée ou modifiée (Accès permanent potentiel sur " + file + ")";
            } else if ("DELETED".equals(action)) {
                detectedSeverity = Severity.MEDIUM;
                ruleId = "FIM-SSHKEY-02";
                alertMessage = "Clé SSH supprimée (Nettoyage de traces sur " + file + ")";
            }
        } else if (file.equals("/etc/cron.allow") || file.equals("/etc/cron.deny")) {
            detectedSeverity = Severity.MEDIUM;
            ruleId = "FIM-CRON-03";
            alertMessage = "Permissions des tâches planifiées modifiées (" + file + ")";
        }

        if (detectedSeverity != null) {
            AlertRecord alert = new AlertRecord();
            alert.setAgent(event.getAgent());
            alert.setEventId(event.getId());
            alert.setRuleId(ruleId);
            alert.setSeverity(detectedSeverity);
            alert.setMessage("INTÉGRITÉ COMPROMISE : " + alertMessage);
            alert.setCreatedAt(Instant.now());
            alert.setStatus(AlertStatus.NEW);
            alerts.add(alert);
        }

        return alerts;
    }

    private Map<String, String> parseLegacyPayload(String payload) {
        Map<String, String> fields = new HashMap<>();
        Matcher m = Pattern.compile("(\\w+)=((?:(?!\\s+\\w+=).)+)").matcher(payload);
        while (m.find()) {
            fields.put(m.group(1), m.group(2).trim());
        }
        return fields;
    }
}