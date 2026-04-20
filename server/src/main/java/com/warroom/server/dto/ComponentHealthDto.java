package com.warroom.server.dto;

public record ComponentHealthDto(
        String componentName,
        boolean running,
        String statusMessage
) {}
