package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.SchoolOnboardingRequest;
import com.myskoolclub.backend.model.SchoolRequestStatus;

import java.time.LocalDateTime;

public record SchoolRequestResponse(
        Long id,
        String firstName,
        String lastName,
        String contactPhone,
        String adminEmail,
        String schoolName,
        String description,
        String address,
        String city,
        String state,
        String postalCode,
        String website,
        String schoolPhone,
        SchoolRequestStatus status,
        String rejectionReason,
        Long reviewedById,
        String reviewedByName,
        LocalDateTime reviewedAt,
        Long createdSchoolId,
        LocalDateTime createdAt
) {
    public static SchoolRequestResponse from(SchoolOnboardingRequest request) {
        return new SchoolRequestResponse(
                request.getId(), request.getFirstName(), request.getLastName(),
                request.getContactPhone(), request.getAdminEmail(), request.getSchoolName(),
                request.getDescription(), request.getAddress(), request.getCity(), request.getState(),
                request.getPostalCode(), request.getWebsite(), request.getSchoolPhone(), request.getStatus(),
                request.getRejectionReason(),
                request.getReviewedBy() == null ? null : request.getReviewedBy().getId(),
                request.getReviewedBy() == null ? null
                        : request.getReviewedBy().getFirstName() + " " + request.getReviewedBy().getLastName(),
                request.getReviewedAt(),
                request.getCreatedSchool() == null ? null : request.getCreatedSchool().getId(),
                request.getCreatedAt()
        );
    }
}
