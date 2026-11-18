package com.warroom.server.model;

/**
 * Hiérarchie des rôles du SOC WarRoom.
 */
public enum Role {
    L1,       // Analyste Triage
    L2,       // Analyste Réponse
    MANAGER,  // Responsable SOC
    ADMIN     // Administrateur Système
}