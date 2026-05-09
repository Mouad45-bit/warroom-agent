package com.warroom.server.dto;

import java.time.Instant;

public record UserResponse(
        Long userId,
        String username,
        String fullName,
        String role,
        String email,
        boolean active,
        Instant createdAt,
        Instant lastLoginAt
) {}