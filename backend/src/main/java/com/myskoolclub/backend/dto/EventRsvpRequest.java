package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.EventRsvpResponse;
import jakarta.validation.constraints.NotNull;

public record EventRsvpRequest(
        @NotNull EventRsvpResponse response
) {}
