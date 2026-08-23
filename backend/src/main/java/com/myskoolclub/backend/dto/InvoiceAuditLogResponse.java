package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.InvoiceAuditLog;

import java.time.LocalDateTime;

public record InvoiceAuditLogResponse(
        Long id,
        String action,
        Long performedByUserId,
        String performedByName,
        String previousStatus,
        String newStatus,
        String note,
        LocalDateTime performedAt
) {
    public static InvoiceAuditLogResponse from(InvoiceAuditLog log) {
        return new InvoiceAuditLogResponse(
                log.getId(),
                log.getAction().name(),
                log.getPerformedBy().getId(),
                log.getPerformedBy().getFirstName() + " " + log.getPerformedBy().getLastName(),
                log.getPreviousStatus() != null ? log.getPreviousStatus().name() : null,
                log.getNewStatus() != null ? log.getNewStatus().name() : null,
                log.getNote(),
                log.getPerformedAt()
        );
    }
}
