package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.*;

import java.time.LocalDateTime;

public record ContentReportResponse(
        Long id,
        ReportContentType contentType,
        Long contentId,
        ContentReportReason reason,
        String details,
        String contentSnapshot,
        ContentReportStatus status,
        String resolution,
        Long reporterId,
        String reporterName,
        Long contentAuthorId,
        String contentAuthorName,
        boolean contentAuthorSuspended,
        Long reviewedById,
        String reviewedByName,
        LocalDateTime reviewedAt,
        LocalDateTime createdAt
) {
    public static ContentReportResponse from(ContentReport report) {
        return new ContentReportResponse(
                report.getId(), report.getContentType(), report.getContentId(), report.getReason(),
                report.getDetails(), report.getContentSnapshot(), report.getStatus(), report.getResolution(),
                report.getReporter().getId(), displayName(report.getReporter()),
                id(report.getContentAuthor()), displayName(report.getContentAuthor()),
                report.getContentAuthor() != null && !report.getContentAuthor().isEnabled(),
                id(report.getReviewedBy()), displayName(report.getReviewedBy()),
                report.getReviewedAt(), report.getCreatedAt()
        );
    }

    private static Long id(User user) {
        return user == null ? null : user.getId();
    }

    private static String displayName(User user) {
        return user == null ? null : user.getFirstName() + " " + user.getLastName();
    }
}
