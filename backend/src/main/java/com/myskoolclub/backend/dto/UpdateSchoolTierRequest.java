package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.SchoolTier;
import jakarta.validation.constraints.NotNull;

public record UpdateSchoolTierRequest(
        @NotNull(message = "School tier is required") SchoolTier tier
) {}
