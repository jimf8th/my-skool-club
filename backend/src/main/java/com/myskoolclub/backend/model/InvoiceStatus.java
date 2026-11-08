package com.myskoolclub.backend.model;

/**
 * Lifecycle of an {@link Invoice}.
 *
 * DRAFT     → editable by its creator; not yet visible for club-admin review.
 * SUBMITTED → locked for edits; awaiting a club admin's decision.
 * APPROVED  → immutable; awaiting payment (only reachable when paymentRequired = true).
 * PAID      → terminal. Reached directly from SUBMITTED when paymentRequired = false
 *             (nothing to pay, so approval closes it immediately), or from APPROVED
 *             once the club admin records payment.
 * CANCELLED → terminal. Reachable from DRAFT, SUBMITTED, or APPROVED.
 */
public enum InvoiceStatus {
    DRAFT,
    SUBMITTED,
    APPROVED,
    PAID,
    CANCELLED
}
