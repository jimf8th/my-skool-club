package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ClubRequest(
        @NotBlank String name,
        String description,
        @NotNull Long firstAdminUserId
) {}
