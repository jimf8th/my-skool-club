package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.NotBlank;

/** Body for sending a SUBMITTED invoice back to DRAFT. */
public record RejectInvoiceRequest(@NotBlank String reason) {}
