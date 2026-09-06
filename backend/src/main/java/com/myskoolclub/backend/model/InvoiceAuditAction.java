package com.myskoolclub.backend.model;

/** Actions recorded in the invoice audit trail (see {@link InvoiceAuditLog}). */
public enum InvoiceAuditAction {
    CREATED,
    UPDATED,
    SUBMITTED,
    SENT_BACK_TO_DRAFT,
    APPROVED,
    MARKED_PAID,
    CANCELLED
}
