package com.warroom.server.analysis.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.warroom.server.analysis.EventAnalyzer;
import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.SecurityEvent;
import com.warroom.server.model.Severity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class FileIntegrityAnalyzer implements EventAnalyzer {

    private final ObjectMapper objectMapper;

    // Injection de Jackson pour parser le futur format JSON de l'agent
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

        if (payload == null || payload.isEmpty()) {
            return alerts;
        }

        // 1. PARSING ROBUSTE (JSON prioritaire, Regex en fallback)
        Map<String, String> fields;
        try {
            // Tente de lire le payload comme du JSON (La suggestion de ton binôme)
            fields = objectMapper.readValue(payload, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            // Si l'agent n'a pas encore été mis à jour, on utilise le parseur Regex compatible avec les espaces
            fields = parseLegacyPayload(payload);
        }

        String action = fields.get("action");
        String file = fields.get("file");

        // Si le log est illisible, on l'ignore
        if (action == null || file == null) {
            return alerts;
        }

        // 2. Évaluation des règles de sécurité
        Severity detectedSeverity = null;
        String alertMessage = null;

        // --- RÈGLES CRITIQUES (Fichiers vitaux) ---
        if (file.equals("/etc/shadow") || file.equals("/etc/sudoers")) {
            if ("MODIFIED".equals(action) || "DELETED".equals(action)) {
                detectedSeverity = Severity.CRITICAL;
                alertMessage = "Fichier système vital altéré (" + file + ") - Action : " + action;
            }

        } else if (file.equals("/etc/passwd")) {
            if ("MODIFIED".equals(action) || "DELETED".equals(action)) {
                detectedSeverity = Severity.CRITICAL;
                alertMessage = "Modification ou Suppression de /etc/passwd (Backdoor ou Déni de service)";
            }
        }

        // --- RÈGLES HAUTES & MOYENNES (Persistance et Configuration) ---
        else if (file.equals("/etc/ssh/sshd_config")) {
            if ("MODIFIED".equals(action) || "DELETED".equals(action)) {
                detectedSeverity = Severity.HIGH;
                alertMessage = "Configuration du serveur SSH modifiée ou supprimée";
            }

        } else if (file.equals("/etc/crontab") || file.startsWith("/var/spool/cron/crontabs/")) {
            if ("MODIFIED".equals(action) || "DELETED".equals(action)) {
                detectedSeverity = Severity.HIGH;
                alertMessage = "Tâche planifiée globale altérée (Fichier : " + file + ")";
            }

        } else if (file.startsWith("/etc/cron.d/") && "CREATED".equals(action)) {
            detectedSeverity = Severity.HIGH;
            alertMessage = "Nouvelle tâche planifiée système créée (Tentative de persistance suspectée)";

        } else if (file.endsWith("/authorized_keys") || file.endsWith("/authorized_keys2")) {
            if ("MODIFIED".equals(action) || "CREATED".equals(action)) {
                detectedSeverity = Severity.HIGH;
                alertMessage = "Clé SSH ajoutée ou modifiée (Accès permanent potentiel sur " + file + ")";
            }
            else if ("DELETED".equals(action)) {
                detectedSeverity = Severity.MEDIUM;
                alertMessage = "Clé SSH supprimée (Nettoyage de traces ou Déni de service sur " + file + ")";
            }
        }

        // --- RÈGLES MOYENNES ---
        else if (file.equals("/etc/cron.allow") || file.equals("/etc/cron.deny")) {
            detectedSeverity = Severity.MEDIUM;
            alertMessage = "Permissions des tâches planifiées modifiées (" + file + ")";
        }

        // 3. Création de l'alerte si une règle a matché
        if (detectedSeverity != null) {
            AlertRecord alert = new AlertRecord();
            alert.setAgent(event.getAgent());
            alert.setRuleId("FIM-SSH-SHADOW-ETC");
            alert.setEventId(event.getId());
            alert.setSeverity(detectedSeverity);
            alert.setMessage("INTÉGRITÉ COMPROMISE : " + alertMessage);
            alert.setCreatedAt(Instant.now());
            alert.setAcknowledged(false);

            alerts.add(alert);
        }

        return alerts;
    }

    /**
     * Parseur de secours utilisant une Regex magique.
     * Il identifie une clé, le signe '=', et capture tout ce qui suit
     * JUSQU'À la prochaine "clé=" ou la fin de la ligne.
     * Résultat : les espaces dans les chemins de fichiers sont supportés !
     */
    private Map<String, String> parseLegacyPayload(String payload) {
        Map<String, String> fields = new HashMap<>();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\w+)=((?:(?!\\s+\\w+=).)+)").matcher(payload);
        while (m.find()) {
            fields.put(m.group(1), m.group(2).trim());
        }
        return fields;
    }
}