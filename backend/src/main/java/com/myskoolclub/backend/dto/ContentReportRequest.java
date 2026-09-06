package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.ContentReportReason;
import com.myskoolclub.backend.model.ReportContentType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ContentReportRequest(
        @NotNull ReportContentType contentType,
        @NotNull Long contentId,
        @NotNull ContentReportReason reason,
        @Size(max = 1000) String details
) {}
