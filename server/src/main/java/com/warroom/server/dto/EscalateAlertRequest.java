package com.warroom.server.dto;

import java.util.List;

public record EscalateAlertRequest(
        String title,
        String severity,
        String triageNote,
        Long assignedToUserId,          // nullable = pool L2
        List<Long> additionalAlertIds   // alertes supplémentaires à regrouper (peut être vide)
) {}