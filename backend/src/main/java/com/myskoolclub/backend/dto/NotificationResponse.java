package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.Notification;
import com.myskoolclub.backend.model.NotificationType;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        NotificationType type,
        String referenceId,
        String message,
        boolean read,
        LocalDateTime createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getReferenceId(),
                n.getMessage(),
                n.isRead(),
                n.getCreatedAt()
        );
    }
}
