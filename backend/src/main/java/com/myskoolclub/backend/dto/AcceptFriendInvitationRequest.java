package com.myskoolclub.backend.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AcceptFriendInvitationRequest(
        @NotBlank @Size(max = 128) String token,
        @NotNull @AssertTrue(message = "You must confirm you are at least 13") Boolean ageConfirmed,
        @NotNull @AssertTrue(message = "You must accept the Terms, Privacy Policy, and Community Standards") Boolean acceptedTerms
) {}
