package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.ContentReportStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ModerationDecisionRequest(
        @NotNull ContentReportStatus status,
        @Size(max = 1000) String resolution
) {}
