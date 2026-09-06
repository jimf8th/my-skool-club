package com.myskoolclub.backend.dto;

public record FriendInvitationDetailsResponse(
        String firstName,
        String lastName,
        String maskedEmail
) {}
