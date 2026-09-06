package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.Announcement;

import java.time.LocalDateTime;

public record AnnouncementResponse(
        Long id,
        Long schoolId,
        String title,
        String body,
        Long createdByUserId,
        String createdByName,
        LocalDateTime createdAt
) {
    public static AnnouncementResponse from(Announcement a) {
        return new AnnouncementResponse(
                a.getId(), a.getSchool().getId(), a.getTitle(), a.getBody(),
                a.getCreatedBy().getId(), a.getCreatedBy().getFirstName() + " " + a.getCreatedBy().getLastName(),
                a.getCreatedAt()
        );
    }
}
