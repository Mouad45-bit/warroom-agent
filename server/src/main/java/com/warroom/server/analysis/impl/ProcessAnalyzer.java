package com.warroom.server.analysis.impl;

import com.warroom.server.analysis.EventAnalyzer;
import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.SecurityEvent;
import com.warroom.server.model.AlertStatus;
import com.warroom.server.model.Severity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ProcessAnalyzer implements EventAnalyzer {

    private final Map<String, Set<String>> knownRootProcesses = new ConcurrentHashMap<>();
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
            try { cpu = Double.parseDouble(columns[2]); }
            catch (NumberFormatException ignored) {}

            activePids.add(pid);
            String rootProcessKey = pid + ":" + command;
            boolean isNewRoot = false;

            if ("root".equals(user)) {
                currentRootProcesses.add(rootProcessKey);
                if (!previousRootProcesses.isEmpty() && !previousRootProcesses.contains(rootProcessKey)) {
                    isNewRoot = true;
                }
            }

            if (isNewRoot) {
                alerts.add(buildAlert(event, "PROC-NEW-ROOT", Severity.HIGH,
                        "Nouveau processus root démarré : " + command + " (PID: " + pid + ")"));
            }

            if (MINERS.stream().anyMatch(lowerCommand::contains)) {
                alerts.add(buildAlert(event, "PROC-MINER-01", Severity.CRITICAL,
                        "Cryptomineur confirmé : " + command + " (PID: " + pid + ")"));
                continue;
            }

            if (OFFENSIVE_TOOLS.stream().anyMatch(lowerCommand::contains)) {
                alerts.add(buildAlert(event, "PROC-OFFENS-01", Severity.HIGH,
                        "Processus offensif détecté : " + command + " (PID: " + pid + ")"));
                continue;
            }

            if (cpu > 90.0 && !cpuAlertedPids.contains(pid)) {
                alerts.add(buildAlert(event, "PROC-CPU-HIGH", Severity.HIGH,
                        "Surcharge CPU critique (" + cpu + "%) : " + command + " (PID: " + pid + ")"));
                cpuAlertedPids.add(pid);
            } else if (cpu > 80.0 && !cpuAlertedPids.contains(pid)) {
                alerts.add(buildAlert(event, "PROC-CPU-MEDIUM", Severity.MEDIUM,
                        "CPU anormal (" + cpu + "%) : " + command + " (PID: " + pid + ")"));
                cpuAlertedPids.add(pid);
            }
        }

        cpuAlertedPids.retainAll(activePids);
        alertedHighCpuPids.put(agentId, cpuAlertedPids);
        knownRootProcesses.put(agentId, currentRootProcesses);

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