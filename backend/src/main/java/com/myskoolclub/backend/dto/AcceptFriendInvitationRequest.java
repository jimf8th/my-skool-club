package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AcceptFriendInvitationRequest(
        @NotBlank @Size(max = 128) String token,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "Code must be 6 digits") String code,
        @NotBlank
        @Size(min = 8, max = 128)
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
                message = "Password must include uppercase, lowercase, number, and symbol"
        ) String password,
        @NotNull @AssertTrue(message = "You must confirm you are at least 13") Boolean ageConfirmed,
        @NotNull @AssertTrue(message = "You must accept the Terms, Privacy Policy, and Community Standards") Boolean acceptedTerms
) {}
