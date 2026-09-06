package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SchoolRequest(
        @NotBlank String name,
        String description,
        @NotNull Long adminUserId
) {}
