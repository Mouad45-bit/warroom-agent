package com.warroom.server.service;

import com.warroom.server.analysis.EventAnalyzer;
import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.SecurityEvent;
import com.warroom.server.repository.AlertRecordRepository;
import com.warroom.server.repository.SecurityEventRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Slf4j
@Service
public class EventAnalysisService {

    // La clé est le sourceType, la valeur est une LISTE d'analyseurs abonnés à ce type
    private final Map<String, List<EventAnalyzer>> analyzers;
    private final AlertRecordRepository alertRepository;
    private final SseNotificationService sseService;

    public EventAnalysisService(List<EventAnalyzer> analyzerList,
                                AlertRecordRepository alertRepository, SseNotificationService sseService) {

        // groupingBy regroupe tous les analyseurs qui ont le même sourceType dans une List
        this.analyzers = analyzerList.stream()
                .collect(Collectors.groupingBy(EventAnalyzer::supportedSourceType));

        this.alertRepository = alertRepository;
        this.sseService = sseService;
    }

    @Transactional
    public void analyze(SecurityEvent event) {
        // On récupère la liste des analyseurs pour ce type (ou une liste vide si aucun n'existe)
        List<EventAnalyzer> matchedAnalyzers = analyzers.getOrDefault(event.getSourceType(), Collections.emptyList());

        for (EventAnalyzer analyzer : matchedAnalyzers) {
            List<AlertRecord> alerts = analyzer.analyze(event);
            if (!alerts.isEmpty()) {
                for (AlertRecord alert : alerts) {
                    alert.setSourceType(event.getSourceType());
                }

                alertRepository.saveAll(alerts);

                for (AlertRecord alert : alerts) {
                    System.err.println(" ALERTE [" + alert.getSeverity() + "] : " + alert.getMessage());
                    sseService.broadcast(alert);
                }
            }
        }
    }
}