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
public class KernLogAnalyzer implements EventAnalyzer {

    @Override
    public String supportedSourceType() {
        return "linux.kern.log";
    }

    @Override
    public List<AlertRecord> analyze(SecurityEvent event) {
        List<AlertRecord> alerts = new ArrayList<>();
        String payload = event.getPayload();

        if (payload == null || payload.isEmpty()) return alerts;

        // Règle 1 : Chargement de module noyau (Technique utilisée par les Rootkits)
        if (payload.contains("insmod") || (payload.contains("module") && payload.contains("loaded"))) {
            alerts.add(buildAlert(event, Severity.CRITICAL, "Chargement de module Kernel détecté (Rootkit potentiel)."));
        }
        // Règle 2 : Erreur de segmentation (Tentative d'exploitation de faille mémoire)
        else if (payload.contains("segfault")) {
            alerts.add(buildAlert(event, Severity.LOW, "Erreur de segmentation (Segfault) détectée sur le noyau."));
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