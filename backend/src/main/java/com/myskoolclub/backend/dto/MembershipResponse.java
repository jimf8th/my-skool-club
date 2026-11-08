package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.ClubMembership;
import com.myskoolclub.backend.model.MembershipRole;
import com.myskoolclub.backend.model.MembershipStatus;
import com.myskoolclub.backend.model.SchoolMembership;

import java.time.LocalDateTime;

public record MembershipResponse(
        Long id,
        Long userId,
        String userEmail,
        String userFirstName,
        String userLastName,
        MembershipRole role,
        MembershipStatus status,
        LocalDateTime requestedAt,
        LocalDateTime reviewedAt
) {
    public static MembershipResponse from(SchoolMembership m) {
        return new MembershipResponse(
                m.getId(),
                m.getUser().getId(),
                m.getUser().getEmail(),
                m.getUser().getFirstName(),
                m.getUser().getLastName(),
                m.getRole(),
                m.getStatus(),
                m.getRequestedAt(),
                m.getReviewedAt()
        );
    }

    public static MembershipResponse from(ClubMembership m) {
        return new MembershipResponse(
                m.getId(),
                m.getUser().getId(),
                m.getUser().getEmail(),
                m.getUser().getFirstName(),
                m.getUser().getLastName(),
                m.getRole(),
                m.getStatus(),
                m.getRequestedAt(),
                m.getReviewedAt()
        );
    }
}
