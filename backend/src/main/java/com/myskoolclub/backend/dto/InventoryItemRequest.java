package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Body for creating or updating an inventory item. */
public record InventoryItemRequest(
        @NotNull @Size(min = 1, max = 200) String name,
        @Size(max = 2000) String description,
        @Size(max = 100) String category,
        @Size(max = 100) String serialNumber
) {}
