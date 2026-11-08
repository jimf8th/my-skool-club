package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record LineItemRequest(
        @NotBlank String description,
        @NotNull @Positive Integer quantity,
        @NotNull @DecimalMin(value = "0.01") BigDecimal unitPrice
) {}
