package com.warroom.server.analysis.impl;

import com.warroom.server.analysis.EventAnalyzer;
import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.SecurityEvent;
import com.warroom.server.model.AlertStatus;
import com.warroom.server.model.Severity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class AuthLogAnalyzer implements EventAnalyzer {

    private final Map<String, Deque<Instant>> ipFailureWindow = new ConcurrentHashMap<>();

    private static final int WINDOW_SECONDS = 60;
    private static final int BRUTE_FORCE_THRESHOLD = 5;

    private static final Pattern IP_PATTERN = Pattern.compile("from (\\d+\\.\\d+\\.\\d+\\.\\d+)");

    @Override
    public String supportedSourceType() {
        return "linux.auth.log";
    }

    @Override
    public List<AlertRecord> analyze(SecurityEvent event) {
        List<AlertRecord> alerts = new ArrayList<>();
        String payload = event.getPayload();

        if (payload == null || payload.isEmpty()) {
            return alerts;
        }

        boolean isRootLogin = payload.contains("Accepted password for root")
                || payload.contains("session opened for user root");

        if (isRootLogin) {
            alerts.add(buildAlert(event, "AUTH-ROOT-01", Severity.CRITICAL, "Alerte Critique : Connexion ROOT détectée avec succès."));
            return alerts;
        }

        if (payload.contains("Failed password")) {
            String sourceIp = extractIp(payload);
            String trackingKey = (sourceIp != null) ? sourceIp : "unknown_ip";

            Deque<Instant> timestamps = ipFailureWindow.computeIfAbsent(trackingKey, k -> new ConcurrentLinkedDeque<>());
            Instant now = Instant.now();

            timestamps.addLast(now);

            while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(now.minusSeconds(WINDOW_SECONDS))) {
                timestamps.pollFirst();
            }

            int currentFailures = timestamps.size();

            if (currentFailures >= BRUTE_FORCE_THRESHOLD) {
                alerts.add(buildAlert(event, "AUTH-BRUTE-01", Severity.HIGH,
                        "ATTAQUE FORCE BRUTE : " + currentFailures + " échecs en " + WINDOW_SECONDS + "s depuis l'IP " + trackingKey));
                ipFailureWindow.remove(trackingKey);

            } else if (currentFailures >= 3) {
                alerts.add(buildAlert(event, "AUTH-SUSP-01", Severity.MEDIUM,
                        "Activité Suspecte : " + currentFailures + " échecs d'authentification depuis l'IP " + trackingKey));
            }
            // 1-2 échecs → comptés silencieusement
        }

        return alerts;
    }

    @Scheduled(fixedRate = 300000)
    public void cleanOldEntries() {
        Instant threshold = Instant.now().minusSeconds(WINDOW_SECONDS);
        ipFailureWindow.entrySet().removeIf(entry -> {
            Deque<Instant> timestamps = entry.getValue();
            while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(threshold)) {
                timestamps.pollFirst();
            }
            return timestamps.isEmpty();
        });
    }

    private String extractIp(String payload) {
        Matcher matcher = IP_PATTERN.matcher(payload);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
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