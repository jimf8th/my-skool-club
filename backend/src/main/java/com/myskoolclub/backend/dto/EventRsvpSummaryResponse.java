package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.EventRsvp;
import com.myskoolclub.backend.model.EventRsvpResponse;

import java.time.LocalDateTime;

public record EventRsvpSummaryResponse(
        Long userId,
        String userFirstName,
        String userLastName,
        EventRsvpResponse response,
        LocalDateTime respondedAt
) {
    public static EventRsvpSummaryResponse from(EventRsvp r) {
        return new EventRsvpSummaryResponse(
                r.getUser().getId(),
                r.getUser().getFirstName(),
                r.getUser().getLastName(),
                r.getResponse(),
                r.getRespondedAt()
        );
    }
}
