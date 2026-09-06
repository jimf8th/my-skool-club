package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.AppRole;
import com.myskoolclub.backend.model.User;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        Integer graduationYear,
        AppRole appRole,
        boolean emailVerified,
        LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getGraduationYear(),
                user.getAppRole(),
                user.isEmailVerified(),
                user.getCreatedAt()
        );
    }
}
