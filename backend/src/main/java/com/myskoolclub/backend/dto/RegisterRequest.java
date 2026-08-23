package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
        @NotBlank String firstName,
        @NotBlank String lastName,
        Integer graduationYear,
        @NotNull @AssertTrue(message = "You must confirm you are at least 13") Boolean ageConfirmed,
        @NotNull @AssertTrue(message = "You must accept the Terms, Privacy Policy, and Community Standards") Boolean acceptedTerms
) {}
