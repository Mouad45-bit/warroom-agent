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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class NetworkAnalyzer implements EventAnalyzer {

    private final Map<String, Set<String>> knownListenPorts = new ConcurrentHashMap<>();

    private static final Set<String> STANDARD_PORTS = Set.of("22", "80", "443", "8080", "3306", "5432");
    private static final Set<String> MALICIOUS_PORTS = Set.of("4444", "4445", "1337", "5555", "9999");
    private static final Set<String> SUSPICIOUS_PROCESSES = Set.of("nc", "ncat", "bash", "sh", "python", "python3", "perl", "ruby");

    private static final Pattern PROCESS_PATTERN = Pattern.compile("\"(\\w+)\",pid=(\\d+)");

    @Override
    public String supportedSourceType() {
        return "network.connections";
    }

    @Override
    public List<AlertRecord> analyze(SecurityEvent event) {
        List<AlertRecord> alerts = new ArrayList<>();
        String payload = event.getPayload();
        String agentId = event.getAgent().getAgentId();

        if (payload == null || payload.isEmpty()) return alerts;

        String[] lines = payload.split("\n");
        Set<String> currentListenPorts = new HashSet<>();
        Set<String> previousListenPorts = knownListenPorts.getOrDefault(agentId, new HashSet<>());

        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;

            String[] columns = line.split("\\s+");
            if (columns.length < 5) continue;

            String state = columns[0];
            String localAddressFull = columns[3];
            String peerAddressFull = columns[4];
            String processInfo = (columns.length > 5) ? columns[5] : "unknown";

            String localPort = extractPort(localAddressFull);
            String peerPort = extractPort(peerAddressFull);
            String processName = extractProcessName(processInfo);

            if ("ESTAB".equals(state)) {
                boolean isMaliciousPort = MALICIOUS_PORTS.contains(peerPort);
                boolean isSuspiciousProcess = SUSPICIOUS_PROCESSES.contains(processName);
                boolean isExternal = !isLocalNetwork(peerAddressFull);

                if (isMaliciousPort && isSuspiciousProcess) {
                    alerts.add(buildAlert(event, "NET-REVSHELL-01", Severity.CRITICAL,
                            "REVERSE SHELL CONFIRMÉ : '" + processName + "' connecté au port " + peerPort + " (" + peerAddressFull + ")"));
                } else if (isMaliciousPort) {
                    alerts.add(buildAlert(event, "NET-C2-PORT", Severity.CRITICAL,
                            "PORT PIRATE DÉTECTÉ : Connexion vers le port " + peerPort + " (" + peerAddressFull + ") via '" + processName + "'"));
                } else if (isSuspiciousProcess && isExternal) {
                    alerts.add(buildAlert(event, "NET-SUSP-EXT", Severity.HIGH,
                            "PROCESSUS SUSPECT EN RÉSEAU : '" + processName + "' connecté à " + peerAddressFull + ":" + peerPort));
                } else if (!isStandardPort(peerPort) && isExternal && "unknown".equals(processName)) {
                    alerts.add(buildAlert(event, "NET-UNK-EXT", Severity.MEDIUM,
                            "Connexion vers port inhabituel " + peerPort + " (" + peerAddressFull + ") - processus non identifié"));
                }
            }

            if ("LISTEN".equals(state)) {
                currentListenPorts.add(localPort);

                if (!previousListenPorts.contains(localPort) && !previousListenPorts.isEmpty()) {
                    if (!isStandardPort(localPort)) {
                        alerts.add(buildAlert(event, "NET-NEW-LISTEN", Severity.HIGH,
                                "NOUVEAU SERVICE SUSPECT : Port non-standard en écoute (" + localPort + ") par '" + processName + "'"));
                    } else {
                        alerts.add(buildAlert(event, "NET-NEW-LISTEN", Severity.MEDIUM,
                                "Nouveau service démarré sur le port standard : " + localPort));
                    }
                }
            }
        }

        knownListenPorts.put(agentId, currentListenPorts);
        return alerts;
    }

    private String extractPort(String addressFull) {
        int lastColon = addressFull.lastIndexOf(':');
        if (lastColon != -1 && lastColon < addressFull.length() - 1) {
            return addressFull.substring(lastColon + 1);
        }
        return "unknown";
    }

    private String extractProcessName(String processInfo) {
        if ("unknown".equals(processInfo)) return "unknown";
        Matcher matcher = PROCESS_PATTERN.matcher(processInfo);
        return matcher.find() ? matcher.group(1) : "unknown";
    }

    private boolean isStandardPort(String port) {
        return STANDARD_PORTS.contains(port);
    }

    private boolean isLocalNetwork(String ip) {
        if (ip.startsWith("127.") || ip.startsWith("0.0.0.0") || ip.startsWith("::") || ip.equals("*")) return true;
        if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
        if (ip.startsWith("172.")) {
            String[] parts = ip.split("\\.");
            if (parts.length > 1) {
                try {
                    int secondOctet = Integer.parseInt(parts[1]);
                    return secondOctet >= 16 && secondOctet <= 31;
                } catch (NumberFormatException ignored) {}
            }
        }
        return false;
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