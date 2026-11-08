package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Body for checking an item out. */
public record CheckOutRequest(
        LocalDate dueDate,
        @Size(max = 2000) String notes
) {}
