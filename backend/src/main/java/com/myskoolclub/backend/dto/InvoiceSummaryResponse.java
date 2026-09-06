package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.Invoice;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Lightweight invoice representation for list views. */
public record InvoiceSummaryResponse(
        Long id,
        String title,
        BigDecimal totalAmount,
        String status,
        boolean paymentRequired,
        Long createdByUserId,
        String createdByName,
        LocalDateTime createdAt,
        LocalDateTime submittedAt
) {
    public static InvoiceSummaryResponse from(Invoice inv) {
        return new InvoiceSummaryResponse(
                inv.getId(),
                inv.getTitle(),
                inv.getTotalAmount(),
                inv.getStatus().name(),
                inv.isPaymentRequired(),
                inv.getCreatedBy().getId(),
                inv.getCreatedBy().getFirstName() + " " + inv.getCreatedBy().getLastName(),
                inv.getCreatedAt(),
                inv.getSubmittedAt()
        );
    }
}
