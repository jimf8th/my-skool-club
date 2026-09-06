package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.InvoiceLineItem;

import java.math.BigDecimal;

public record LineItemResponse(
        Long id,
        String description,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice
) {
    public static LineItemResponse from(InvoiceLineItem item) {
        return new LineItemResponse(
                item.getId(),
                item.getDescription(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getTotalPrice()
        );
    }
}
