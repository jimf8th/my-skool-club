package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SubmitSchoolRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Size(max = 40) String contactPhone,
        @NotBlank @Email @Size(max = 320) String adminEmail,
        @NotBlank @Size(max = 255) String schoolName,
        @NotBlank @Size(max = 4000) String description,
        @NotBlank @Size(max = 255) String address,
        @NotBlank @Size(max = 120) String city,
        @NotBlank @Size(max = 120) String state,
        @NotBlank @Size(max = 30) String postalCode,
        @NotBlank @Size(max = 500)
        @Pattern(regexp = "(?i)^https?://.+", message = "Website must begin with http:// or https://")
        String website,
        @NotBlank @Size(max = 40) String schoolPhone
) {}
