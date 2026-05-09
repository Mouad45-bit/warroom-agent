package com.warroom.server.model;

public enum IncidentStatus {
    OPEN,                   // Créé par le L1, en attente de prise en charge
    INVESTIGATING,          // L2 analyse la menace
    REMEDIATING,            // L2 applique les contre-mesures
    RESOLVED,               // Contre-mesures appliquées, en observation
    CLOSED,                 // Confirmé résolu, archivé
    CLOSED_FALSE_POSITIVE   // Renvoyé au L1, ce n'était pas un vrai incident
}