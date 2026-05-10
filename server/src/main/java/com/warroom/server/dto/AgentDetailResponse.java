package com.warroom.server.dto;

import com.warroom.server.entity.Agent;
import com.warroom.server.entity.AgentHealthRecord;
import java.util.List;

public record AgentDetailResponse(
        Agent agent,
        AgentHealthRecord latestRecord,
        List<HeartbeatSummaryDto> recentHeartbeats,
        List<ComponentHealthDto> components,
        List<String> quarantinedComponents
) {}