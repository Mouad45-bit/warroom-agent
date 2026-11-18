package com.warroom.server.service;

import com.warroom.server.model.IncidentStatus;

import java.util.Map;
import java.util.Set;

/**
 * Machine à états du cycle de vie d'un incident.
 * Définit les transitions autorisées selon le cahier des charges.
 */
public class IncidentStatusMachine {

    private IncidentStatusMachine() {} // utilitaire

    private static final Map<IncidentStatus, Set<IncidentStatus>> TRANSITIONS = Map.of(
            IncidentStatus.OPEN,          Set.of(IncidentStatus.INVESTIGATING),
            IncidentStatus.INVESTIGATING, Set.of(IncidentStatus.REMEDIATING),
            IncidentStatus.REMEDIATING,   Set.of(IncidentStatus.RESOLVED, IncidentStatus.INVESTIGATING),
            IncidentStatus.RESOLVED,      Set.of(IncidentStatus.CLOSED, IncidentStatus.REMEDIATING)
            // CLOSED et CLOSED_FALSE_POSITIVE → aucune transition possible
    );

    /**
     * Vérifie si la transition est autorisée.
     */
    public static boolean isAllowed(IncidentStatus from, IncidentStatus to) {
        Set<IncidentStatus> allowed = TRANSITIONS.get(from);
        return allowed != null && allowed.contains(to);
    }

    /**
     * Retourne un message d'erreur lisible pour les transitions interdites.
     */
    public static String errorMessage(IncidentStatus from, IncidentStatus to) {
        if (from == IncidentStatus.CLOSED || from == IncidentStatus.CLOSED_FALSE_POSITIVE) {
            return "Un incident clôturé ne peut plus être modifié.";
        }
        Set<IncidentStatus> allowed = TRANSITIONS.get(from);
        if (allowed == null || allowed.isEmpty()) {
            return "Aucune transition possible depuis le statut " + from;
        }
        return "Transition " + from + " → " + to + " interdite. Transitions autorisées : " + allowed;
    }
}