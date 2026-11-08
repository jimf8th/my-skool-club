package com.myskoolclub.backend.dto;

import java.math.BigDecimal;

/** A single line item as extracted from a scanned receipt image. */
public record ScannedLineItem(String description, Integer quantity, BigDecimal unitPrice) {}
