package com.warroom.server.dto;

public record CreateUserRequest(
        String username,
        String password,
        String fullName,
        String role,
        String email
) {}