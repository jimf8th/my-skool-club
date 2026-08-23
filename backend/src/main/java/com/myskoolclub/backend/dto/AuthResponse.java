package com.myskoolclub.backend.dto;

public record AuthResponse(
        String token,
        Long id,
        String email,
        String firstName,
        String lastName,
        String appRole,
        boolean emailVerified
) {}
