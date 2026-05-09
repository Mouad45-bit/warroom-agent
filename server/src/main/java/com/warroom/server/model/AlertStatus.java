package com.warroom.server.model;

public enum AlertStatus {
    NEW,              // Alerte vient d'être générée par un analyzer
    ACKNOWLEDGED,     // L1 a vu et pris en charge
    FALSE_POSITIVE,   // L1 a écarté (avec justification)
    ESCALATED         // L1 a créé un incident (Module 2)
}