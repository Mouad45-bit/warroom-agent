package com.warroom.server.model;

public enum Severity {
    INFO,       // Événement normal loggé pour audit
    LOW,        // Anomalie mineure
    MEDIUM,     // Comportement suspect
    HIGH,       // Menace probable (brute-force, connexion root)
    CRITICAL    // Intrusion confirmée (modification /etc/shadow, reverse shell)
}
