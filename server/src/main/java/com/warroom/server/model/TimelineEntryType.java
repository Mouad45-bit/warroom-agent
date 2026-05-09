package com.warroom.server.model;

public enum TimelineEntryType {
    STATUS_CHANGE,    // Changement de statut (OPEN → INVESTIGATING, etc.)
    NOTE,             // Note libre (L1, L2, Manager)
    COUNTERMEASURE,   // Contre-mesure appliquée (Module 3)
    REASSIGNMENT,     // Réassignation par le Manager
    CLOSURE           // Clôture ou renvoi au L1
}