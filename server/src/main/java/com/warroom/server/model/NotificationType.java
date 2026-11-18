package com.warroom.server.model;

public enum NotificationType {
    INCIDENT_ASSIGNED,   // → L2 quand un incident lui est assigné
    INCIDENT_RETURNED,   // → L1 quand son escalade est renvoyée
    SLA_WARNING          // → MANAGER (future extension)
}