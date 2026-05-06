package com.warroom.server.analysis.impl;

import com.warroom.server.analysis.EventAnalyzer;
import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.SecurityEvent;
import com.warroom.server.model.Severity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ProcessAnalyzer implements EventAnalyzer {

    // Mémoire 1 : Suivi des processus root (Clé = pid:command)
    private final Map<String, Set<String>> knownRootProcesses = new ConcurrentHashMap<>();

    // Mémoire 2 : Suivi anti-spam des alertes CPU (Clé = pid)
    private final Map<String, Set<String>> alertedHighCpuPids = new ConcurrentHashMap<>();

    private static final Set<String> MINERS = Set.of("minerd", "xmrig", "cgminer");
    private static final Set<String> OFFENSIVE_TOOLS = Set.of("nc", "ncat", "metasploit", "msfconsole");

    @Override
    public String supportedSourceType() {
        return "process.list";
    }

    @Override
    public List<AlertRecord> analyze(SecurityEvent event) {
        List<AlertRecord> alerts = new ArrayList<>();
        String payload = event.getPayload();
        String agentId = event.getAgent().getAgentId();

        if (payload == null || payload.isEmpty()) return alerts;

        String[] lines = payload.split("\n");

        // Préparation des états pour ce snapshot
        Set<String> previousRootProcesses = knownRootProcesses.getOrDefault(agentId, new HashSet<>());
        Set<String> currentRootProcesses = new HashSet<>();

        Set<String> cpuAlertedPids = alertedHighCpuPids.getOrDefault(agentId, new HashSet<>());
        Set<String> activePids = new HashSet<>(); // Pour le nettoyage (retainAll)

        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;

            String[] columns = line.split("\\s+", 11);
            if (columns.length < 11) continue;

            String user = columns[0];
            String pid = columns[1];
            String command = columns[10];
            String lowerCommand = command.toLowerCase();

            double cpu = 0.0;
            try {
                cpu = Double.parseDouble(columns[2]);
            } catch (NumberFormatException ignored) {}

            // --- 1. SUIVI D'ÉTAT (Doit toujours s'exécuter avant les "continue") ---
            activePids.add(pid);
            String rootProcessKey = pid + ":" + command; // Correction : Clé composée
            boolean isNewRoot = false;

            if ("root".equals(user)) {
                currentRootProcesses.add(rootProcessKey);
                if (!previousRootProcesses.isEmpty() && !previousRootProcesses.contains(rootProcessKey)) {
                    isNewRoot = true;
                }
            }

            // --- 2. ÉVALUATION DES RÈGLES ---

            // Règle 3 : Nouveau processus root (HIGH)
            if (isNewRoot) {
                alerts.add(buildAlert(event, Severity.HIGH, "Nouveau processus root démarré : " + command + " (PID: " + pid + ")"));
            }

            // Règle 1 : Cryptomineur (CRITICAL)
            if (MINERS.stream().anyMatch(lowerCommand::contains) || cpu > 90.0) {
                alerts.add(buildAlert(event, Severity.CRITICAL, "Cryptomineur suspecté : " + command + " (PID: " + pid + ", CPU: " + cpu + "%)"));
                continue; // Correction : Évite la double alerte si le mineur utilise aussi un outil offensif
            }

            // Règle 2 : Processus offensif (HIGH)
            if (OFFENSIVE_TOOLS.stream().anyMatch(lowerCommand::contains)) {
                alerts.add(buildAlert(event, Severity.HIGH, "Processus offensif détecté : " + command + " (PID: " + pid + ")"));
                continue; // On passe à la ligne suivante pour éviter l'alerte CPU
            }

            // Règle 4 : CPU anormal (MEDIUM) avec Anti-Spam
            if (cpu > 80.0) {
                if (!cpuAlertedPids.contains(pid)) { // Correction : Filtre anti-spam
                    alerts.add(buildAlert(event, Severity.MEDIUM, "Consommation CPU anormale (" + cpu + "%) sur processus : " + command + " (PID: " + pid + ")"));
                    cpuAlertedPids.add(pid);
                }
            }
        }

        // --- 3. NETTOYAGE ET SAUVEGARDE EN MÉMOIRE ---
        cpuAlertedPids.retainAll(activePids); // Correction : Efface les PID qui n'existent plus

        alertedHighCpuPids.put(agentId, cpuAlertedPids);
        knownRootProcesses.put(agentId, currentRootProcesses);

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