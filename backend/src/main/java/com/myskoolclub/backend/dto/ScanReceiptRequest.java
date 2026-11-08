package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body for the receipt-scan assist endpoint.
 * imageBase64 may be a raw base64 string or a data URI (e.g. "data:image/jpeg;base64,...").
 */
public record ScanReceiptRequest(
        @NotBlank
        @Size(max = 10_000_000, message = "Receipt image must be smaller than 7.5 MB")
        String imageBase64
) {}
