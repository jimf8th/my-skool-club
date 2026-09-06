package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectSchoolRequest(
        @NotBlank @Size(max = 1000) String reason
) {}
