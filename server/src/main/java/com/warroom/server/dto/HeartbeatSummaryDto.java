package com.warroom.server.dto;

import com.warroom.server.model.HealthStatus;
import java.time.Instant;

public record HeartbeatSummaryDto(
        Instant timestamp,
        HealthStatus healthStatus,
        long queuedEvents
) {}