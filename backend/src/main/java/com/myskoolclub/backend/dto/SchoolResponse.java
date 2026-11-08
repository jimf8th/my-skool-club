package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.School;
import com.myskoolclub.backend.model.SchoolMembership;
import com.myskoolclub.backend.model.SchoolTier;

import java.time.LocalDateTime;
import java.util.List;

public record SchoolResponse(
        Long id,
        String name,
        String description,
        String address,
        String city,
        String state,
        String postalCode,
        String website,
        String phone,
        boolean enabled,
        SchoolTier tier,
        LocalDateTime createdAt,
        List<MembershipResponse> admins
) {
    /** Used for list views – admins not loaded. */
    public static SchoolResponse from(School school) {
        return new SchoolResponse(
                school.getId(),
                school.getName(),
                school.getDescription(),
                school.getAddress(), school.getCity(), school.getState(), school.getPostalCode(),
                school.getWebsite(), school.getPhone(),
                school.isEnabled(),
                school.getTier(),
                school.getCreatedAt(),
                List.of()
        );
    }

    /** Used for detail views – admins included. */
    public static SchoolResponse from(School school, List<SchoolMembership> adminMemberships) {
        return new SchoolResponse(
                school.getId(),
                school.getName(),
                school.getDescription(),
                school.getAddress(), school.getCity(), school.getState(), school.getPostalCode(),
                school.getWebsite(), school.getPhone(),
                school.isEnabled(),
                school.getTier(),
                school.getCreatedAt(),
                adminMemberships.stream().map(MembershipResponse::from).toList()
        );
    }
}
