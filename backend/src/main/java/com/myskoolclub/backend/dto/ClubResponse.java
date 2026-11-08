package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.Club;
import com.myskoolclub.backend.model.ClubMembership;
import com.myskoolclub.backend.model.SchoolTier;

import java.time.LocalDateTime;
import java.util.List;

public record ClubResponse(
        Long id,
        String name,
        String description,
        Long schoolId,
        String schoolName,
        SchoolTier schoolTier,
        LocalDateTime createdAt,
        List<MembershipResponse> admins
) {
    /** Used for list views – admins not loaded. */
    public static ClubResponse from(Club club) {
        return new ClubResponse(
                club.getId(),
                club.getName(),
                club.getDescription(),
                club.getSchool().getId(),
                club.getSchool().getName(),
                club.getSchool().getTier(),
                club.getCreatedAt(),
                List.of()
        );
    }

    /** Used for detail views – admins included. */
    public static ClubResponse from(Club club, List<ClubMembership> adminMemberships) {
        return new ClubResponse(
                club.getId(),
                club.getName(),
                club.getDescription(),
                club.getSchool().getId(),
                club.getSchool().getName(),
                club.getSchool().getTier(),
                club.getCreatedAt(),
                adminMemberships.stream().map(MembershipResponse::from).toList()
        );
    }
}
