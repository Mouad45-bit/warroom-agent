package com.warroom.server.analysis.impl;

import com.warroom.server.analysis.EventAnalyzer;
import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.SecurityEvent;
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

    // Mémoire : Associe une IP source à une file d'attente d'horodatages (les échecs)
    private final Map<String, Deque<Instant>> ipFailureWindow = new ConcurrentHashMap<>();

    // Configuration de la fenêtre de détection
    private static final int WINDOW_SECONDS = 60;
    private static final int BRUTE_FORCE_THRESHOLD = 5;

    // Regex pour extraire l'IPv4 du log SSH classique
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

        // --- RÈGLE 1 : Connexion ROOT (Tolérance Zéro) ---
        boolean isRootLogin = payload.contains("Accepted password for root")
                || payload.contains("session opened for user root")
                || payload.contains("Mot de passe accepté pour root");

        if (isRootLogin) {
            alerts.add(buildAlert(event,"AUTH-ROOT-01", Severity.CRITICAL, "Alerte Critique : Connexion ROOT détectée avec succès."));
            return alerts; // On arrête l'analyse pour cette ligne
        }

        // --- RÈGLE 2 : Échec d'authentification et Force Brute ---
        boolean isFailure = payload.contains("Failed password")
                || payload.contains("Mot de passe échoué");

        if (isFailure) {
            String sourceIp = extractIp(payload);

            // Si on ne trouve pas l'IP, on utilise "unknown" pour quand même compter les échecs globaux
            String trackingKey = (sourceIp != null) ? sourceIp : "unknown_ip";

            // 1. Récupérer ou créer la file d'attente pour cette IP
            Deque<Instant> timestamps = ipFailureWindow.computeIfAbsent(trackingKey, k -> new ConcurrentLinkedDeque<>());
            Instant now = Instant.now();

            // 2. Ajouter l'échec actuel
            timestamps.addLast(now);

            // 3. Nettoyer la fenêtre glissante (supprimer les échecs plus vieux que 60 secondes)
            while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(now.minusSeconds(WINDOW_SECONDS))) {
                timestamps.pollFirst();
            }

            int currentFailures = timestamps.size();

            // 4. Échelonnage de la sévérité
            if (currentFailures >= BRUTE_FORCE_THRESHOLD) {
                alerts.add(buildAlert(event, "AUTH-BRUTE-01",Severity.HIGH,
                        "ATTAQUE FORCE BRUTE : " + currentFailures + " échecs en " + WINDOW_SECONDS + "s depuis l'IP " + trackingKey));

                // Cooldown : On vide la file pour ne pas spammer d'alertes HIGH à chaque nouvelle ligne
                ipFailureWindow.remove(trackingKey);

            } else if (currentFailures >= 3) {
                alerts.add(buildAlert(event, "AUTH-SUSP-01",Severity.MEDIUM,
                        "Activité Suspecte : " + currentFailures + " échecs d'authentification depuis l'IP " + trackingKey));

            } else {
                // Pour 1 ou 2 échecs, on génère une alerte INFO (ou on pourrait choisir de ne rien retourner du tout)
                alerts.add(buildAlert(event,"AUTH-FAIL-01", Severity.INFO,
                        "Échec d'authentification isolé depuis l'IP " + trackingKey));
            }
        }

        return alerts;
    }

    /**
     * S'exécute automatiquement toutes les 5 minutes (300000 ms).
     * Parcourt la Map et supprime les IPs "fantômes" qui ont arrêté d'attaquer.
     */
    @Scheduled(fixedRate = 300000)
    public void cleanOldEntries() {
        Instant threshold = Instant.now().minusSeconds(WINDOW_SECONDS);

        // removeIf est "thread-safe" sur une ConcurrentHashMap
        ipFailureWindow.entrySet().removeIf(entry -> {
            Deque<Instant> timestamps = entry.getValue();

            // On supprime les vieux timestamps
            while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(threshold)) {
                timestamps.pollFirst();
            }

            // Si la file devient vide, removeIf renvoie "true" et supprime la clé de la Map
            return timestamps.isEmpty();
        });
    }


    // --- Fonctions Utilitaires ---

    private String extractIp(String payload) {
        Matcher matcher = IP_PATTERN.matcher(payload);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private AlertRecord buildAlert(SecurityEvent event,String ruleId, Severity severity, String message) {
        AlertRecord alert = new AlertRecord();
        alert.setAgent(event.getAgent());
        // Ligne cruciale ajoutée suite à ton audit (Point 1) :
        alert.setEventId(event.getId());
        alert.setRuleId(ruleId);
        alert.setSeverity(severity);
        alert.setMessage(message);
        alert.setCreatedAt(Instant.now());
        alert.setAcknowledged(false);
        return alert;
    }
}