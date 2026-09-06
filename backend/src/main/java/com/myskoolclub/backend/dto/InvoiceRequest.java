package com.myskoolclub.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Body for creating or updating a DRAFT invoice. */
public record InvoiceRequest(
        @NotNull @Size(min = 1, max = 200) String title,
        @Size(max = 2000) String notes,
        boolean paymentRequired,
        @Size(max = 200) String payeeName,
        @Email @Size(max = 200) String payeeEmail,
        @NotEmpty @Valid List<LineItemRequest> lineItems
) {}
