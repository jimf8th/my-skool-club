package com.myskoolclub.backend.dto;

import java.util.List;

/**
 * Result of AI-assisted receipt scanning. This is a stateless preview — nothing
 * is persisted until the user reviews and saves it as a draft invoice.
 */
public record ScanReceiptResponse(
        String suggestedTitle,
        String suggestedPayeeName,
        List<ScannedLineItem> lineItems
) {}
