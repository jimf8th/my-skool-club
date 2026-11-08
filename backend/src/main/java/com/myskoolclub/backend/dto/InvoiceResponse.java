package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.Invoice;
import com.myskoolclub.backend.model.InvoiceAuditLog;
import com.myskoolclub.backend.model.User;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Full invoice detail, including line items and the complete audit trail. */
public record InvoiceResponse(
        Long id,
        Long clubId,
        String clubName,
        Long createdByUserId,
        String createdByName,
        String title,
        String notes,
        boolean paymentRequired,
        String payeeName,
        String payeeEmail,
        BigDecimal totalAmount,
        String status,
        String rejectionReason,
        String cancellationReason,
        LocalDateTime submittedAt,
        LocalDateTime approvedAt,
        Long approvedByUserId,
        String approvedByName,
        LocalDateTime paidAt,
        Long paidByUserId,
        String paidByName,
        LocalDateTime cancelledAt,
        Long cancelledByUserId,
        String cancelledByName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<LineItemResponse> lineItems,
        List<InvoiceAuditLogResponse> auditTrail
) {
    public static InvoiceResponse from(Invoice inv, List<InvoiceAuditLog> auditLogs) {
        return new InvoiceResponse(
                inv.getId(),
                inv.getClub().getId(),
                inv.getClub().getName(),
                inv.getCreatedBy().getId(),
                fullName(inv.getCreatedBy()),
                inv.getTitle(),
                inv.getNotes(),
                inv.isPaymentRequired(),
                inv.getPayeeName(),
                inv.getPayeeEmail(),
                inv.getTotalAmount(),
                inv.getStatus().name(),
                inv.getRejectionReason(),
                inv.getCancellationReason(),
                inv.getSubmittedAt(),
                inv.getApprovedAt(),
                inv.getApprovedBy() != null ? inv.getApprovedBy().getId() : null,
                inv.getApprovedBy() != null ? fullName(inv.getApprovedBy()) : null,
                inv.getPaidAt(),
                inv.getPaidBy() != null ? inv.getPaidBy().getId() : null,
                inv.getPaidBy() != null ? fullName(inv.getPaidBy()) : null,
                inv.getCancelledAt(),
                inv.getCancelledBy() != null ? inv.getCancelledBy().getId() : null,
                inv.getCancelledBy() != null ? fullName(inv.getCancelledBy()) : null,
                inv.getCreatedAt(),
                inv.getUpdatedAt(),
                inv.getLineItems().stream().map(LineItemResponse::from).toList(),
                auditLogs.stream().map(InvoiceAuditLogResponse::from).toList()
        );
    }

    private static String fullName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }
}
