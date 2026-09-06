package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateSchoolRequest(
        @NotBlank String name,
        String description,
        @Size(max = 255) String address,
        @Size(max = 120) String city,
        @Size(max = 120) String state,
        @Size(max = 30) String postalCode,
        @Size(max = 500)
        @Pattern(regexp = "(?i)^(?:https?://.+)?$", message = "Website must begin with http:// or https://")
        String website,
        @Size(max = 40) String phone
) {}
