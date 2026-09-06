package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.AppRole;
import com.myskoolclub.backend.model.User;

import java.time.LocalDateTime;

/** Account details for the APP_ADMIN account-management screen. */
public record AdminAccountResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        AppRole appRole,
        boolean enabled,
        boolean emailVerified,
        boolean signInLinked,
        LocalDateTime suspendedAt,
        String suspensionReason,
        LocalDateTime createdAt
) {
    public static AdminAccountResponse from(User user) {
        return new AdminAccountResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getAppRole(),
                user.isEnabled(),
                user.isEmailVerified(),
                user.getFirebaseUid() != null,
                user.getSuspendedAt(),
                user.getSuspensionReason(),
                user.getCreatedAt()
        );
    }
}
