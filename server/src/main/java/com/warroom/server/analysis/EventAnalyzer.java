package com.warroom.server.analysis;

import com.warroom.server.entity.AlertRecord;
import com.warroom.server.entity.SecurityEvent;
import java.util.List;

public interface EventAnalyzer {

    /**
     * Indique le sourceType que ce composant sait traiter (ex: "linux.auth.log")
     */
    String supportedSourceType();

    /**
     * Analyse l'événement brut et retourne une liste d'alertes (vide si tout est normal)
     */
    List<AlertRecord> analyze(SecurityEvent event);
}