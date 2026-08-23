package com.myskoolclub.backend.dto;

public record RegistrationResponse(
        String message,
        String email,
        boolean verificationRequired
) {}
