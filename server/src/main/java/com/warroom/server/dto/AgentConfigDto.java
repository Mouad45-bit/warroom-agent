package com.warroom.server.dto;

import java.util.List;

public record AgentConfigDto(
        int heartbeatIntervalSeconds,
        int batchSize,
        int retryIntervalSeconds,
        List<String> enabledCollectors
) {}
