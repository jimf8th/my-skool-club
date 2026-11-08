package com.myskoolclub.backend.dto;

/** Body for cancelling an invoice. Reason is optional. */
public record CancelInvoiceRequest(String reason) {}
