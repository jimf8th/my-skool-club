package com.myskoolclub.backend.dto;

public record SessionResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String appRole,
        boolean emailVerified
) {}
