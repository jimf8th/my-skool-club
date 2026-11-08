package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.Size;

/** Body for checking an item back in. */
public record CheckInRequest(
        @Size(max = 2000) String notes
) {}
