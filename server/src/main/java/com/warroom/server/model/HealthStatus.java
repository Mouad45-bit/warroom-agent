package com.warroom.server.model;

public enum HealthStatus {
    GREEN,   // < 90s
    ORANGE,  // 90s à 5min
    RED      // > 5min ou jamais vu
}