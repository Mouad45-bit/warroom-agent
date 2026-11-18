package com.warroom.server.dto;

import java.util.List;

// --- REQUÊTES ---

public record CreateIncidentRequest(
        String title,
        String severity,
        String triageNote,
        Long assignedToUserId,     // nullable = pool L2
        List<Long> alertIds        // au moins 1
) {}

// --- Utilisé par PUT /api/incidents/{id}/status ---
// record ChangeStatusRequest dans un fichier séparé si préféré