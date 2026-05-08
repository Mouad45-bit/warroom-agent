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

        Set<String> previousRootProcesses = knownRootProcesses.getOrDefault(agentId, new HashSet<>());
        Set<String> currentRootProcesses = new HashSet<>();

        Set<String> cpuAlertedPids = alertedHighCpuPids.getOrDefault(agentId, new HashSet<>());
        Set<String> activePids = new HashSet<>();

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

            // --- 1. SUIVI D'ÉTAT ---
            activePids.add(pid);
            String rootProcessKey = pid + ":" + command;
            boolean isNewRoot = false;

            if ("root".equals(user)) {
                currentRootProcesses.add(rootProcessKey);
                if (!previousRootProcesses.isEmpty() && !previousRootProcesses.contains(rootProcessKey)) {
                    isNewRoot = true;
                }
            }

            // --- 2. ÉVALUATION DES RÈGLES SÉPARÉES ---

            // Règle 1 : Nouveau processus root (HIGH)
            if (isNewRoot) {
                alerts.add(buildAlert(event,"PROC-NEW-ROOT", Severity.HIGH, "Nouveau processus root démarré : " + command + " (PID: " + pid + ")"));
            }

            // Règle 2 : Cryptomineur par signature (CRITICAL absolu)
            if (MINERS.stream().anyMatch(lowerCommand::contains)) {
                alerts.add(buildAlert(event,"PROC-MINER-01", Severity.CRITICAL, "Cryptomineur confirmé : " + command + " (PID: " + pid + ")"));
                continue; // On passe au suivant pour ne pas déclencher la règle CPU sur ce processus
            }

            // Règle 3 : Processus offensif (HIGH)
            if (OFFENSIVE_TOOLS.stream().anyMatch(lowerCommand::contains)) {
                alerts.add(buildAlert(event,"PROC-OFFENS-01", Severity.HIGH, "Processus offensif détecté : " + command + " (PID: " + pid + ")"));
                continue;
            }

            // Règle 4 : Consommation CPU anormale par comportement (HIGH / MEDIUM)
            if (cpu > 90.0) {
                if (!cpuAlertedPids.contains(pid)) {
                    alerts.add(buildAlert(event,"PROC-CPU-HIGH", Severity.HIGH, "Surcharge CPU critique (" + cpu + "%) sur processus : " + command + " (PID: " + pid + ")"));
                    cpuAlertedPids.add(pid);
                }
            } else if (cpu > 80.0) {
                if (!cpuAlertedPids.contains(pid)) {
                    alerts.add(buildAlert(event,"PROC-CPU-MEDIUM", Severity.MEDIUM, "Consommation CPU anormale (" + cpu + "%) sur processus : " + command + " (PID: " + pid + ")"));
                    cpuAlertedPids.add(pid);
                }
            }
        }

        // --- 3. NETTOYAGE ET SAUVEGARDE EN MÉMOIRE ---
        cpuAlertedPids.retainAll(activePids);

        alertedHighCpuPids.put(agentId, cpuAlertedPids);
        knownRootProcesses.put(agentId, currentRootProcesses);

        return alerts;
    }

    private AlertRecord buildAlert(SecurityEvent event,String ruleId, Severity severity, String message) {
        AlertRecord alert = new AlertRecord();
        alert.setAgent(event.getAgent());
        alert.setEventId(event.getId());
        alert.setRuleId(ruleId);
        alert.setSeverity(severity);
        alert.setMessage(message);
        alert.setCreatedAt(Instant.now());
        alert.setAcknowledged(false);
        return alert;
    }
}