package com.warroom.server.dto;

public record LoginRequest(
        String username,
        String password
) {}