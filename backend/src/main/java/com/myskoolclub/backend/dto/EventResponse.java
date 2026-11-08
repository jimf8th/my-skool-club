package com.myskoolclub.backend.dto;

import com.myskoolclub.backend.model.Event;
import com.myskoolclub.backend.model.EventRsvpResponse;

import java.time.LocalDateTime;
import java.util.List;

public record EventResponse(
        Long id,
        Long schoolId,
        String title,
        String location,
        LocalDateTime eventTime,
        Long createdByUserId,
        String createdByName,
        LocalDateTime createdAt,
        long yesCount,
        long noCount,
        long maybeCount,
        EventRsvpResponse myResponse,
        List<EventRsvpSummaryResponse> rsvps
) {
    /** Lightweight form for list views — omits the per-attendee RSVP list. */
    public static EventResponse summary(Event e, long yesCount, long noCount, long maybeCount, EventRsvpResponse myResponse) {
        return new EventResponse(
                e.getId(), e.getSchool().getId(), e.getTitle(), e.getLocation(), e.getEventTime(),
                e.getCreatedBy().getId(), e.getCreatedBy().getFirstName() + " " + e.getCreatedBy().getLastName(),
                e.getCreatedAt(), yesCount, noCount, maybeCount, myResponse, null
        );
    }

    /** Full form for detail views — includes the per-attendee RSVP list. */
    public static EventResponse detail(Event e, long yesCount, long noCount, long maybeCount,
                                        EventRsvpResponse myResponse, List<EventRsvpSummaryResponse> rsvps) {
        return new EventResponse(
                e.getId(), e.getSchool().getId(), e.getTitle(), e.getLocation(), e.getEventTime(),
                e.getCreatedBy().getId(), e.getCreatedBy().getFirstName() + " " + e.getCreatedBy().getLastName(),
                e.getCreatedAt(), yesCount, noCount, maybeCount, myResponse, rsvps
        );
    }
}
