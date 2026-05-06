package com.warroom.server.analysis.impl;

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

    @Override
    public String supportedSourceType() {
        return "file.integrity"; // La clé de routage exacte définie par ton binôme
    }

    @Override
    public List<AlertRecord> analyze(SecurityEvent event) {
        List<AlertRecord> alerts = new ArrayList<>();
        String payload = event.getPayload();

        if (payload == null || payload.isEmpty()) {
            return alerts;
        }

        // 1. Parsing du payload (Extraction des paires clé=valeur)
        Map<String, String> fields = parsePayload(payload);

        String action = fields.get("action");
        String file = fields.get("file");

        // Si le log est mal formé, on l'ignore
        if (action == null || file == null) {
            return alerts;
        }

        // 2. Évaluation des règles de sécurité
        Severity detectedSeverity = null;
        String alertMessage = null;

        // --- RÈGLES CRITIQUES (Fichiers vitaux) ---
        if (file.equals("/etc/shadow") || file.equals("/etc/sudoers")) {
            // Correction Point 1 : Filtre explicite sur l'action
            if ("MODIFIED".equals(action) || "DELETED".equals(action)) {
                detectedSeverity = Severity.CRITICAL;
                alertMessage = "Fichier système vital altéré (" + file + ") - Action : " + action;
            }

        } else if (file.equals("/etc/passwd")) {
            // Ajout du DELETED pour passwd également (Correction Point 2)
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
            // Correction Point 3 : On n'est plus silencieux sur la suppression
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
            alert.setEventId(event.getId()); // La traçabilité vers le log brut
            alert.setSeverity(detectedSeverity);
            alert.setMessage("INTÉGRITÉ COMPROMISE : " + alertMessage);
            alert.setCreatedAt(Instant.now());
            alert.setAcknowledged(false);

            alerts.add(alert);
        }

        return alerts;
    }

    /**
     * Méthode utilitaire pour parser "action=MODIFIED file=/etc/passwd old_hash=..."
     */
    private Map<String, String> parsePayload(String payload) {
        Map<String, String> fields = new HashMap<>();
        String[] parts = payload.split(" ");

        for (String part : parts) {
            int eqIndex = part.indexOf('=');
            // On s'assure qu'il y a un '=' et qu'il n'est pas le premier caractère
            if (eqIndex > 0) {
                String key = part.substring(0, eqIndex);
                String value = part.substring(eqIndex + 1);
                fields.put(key, value);
            }
        }
        return fields;
    }
}