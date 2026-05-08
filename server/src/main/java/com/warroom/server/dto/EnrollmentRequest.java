package com.warroom.server.dto;

public record EnrollmentRequest(
        String hostname,
        String osName,
        String osVersion,
        String agentVersion
) {}
