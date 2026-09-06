package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateClubRequest(
        @NotBlank String name,
        String description
) {}
