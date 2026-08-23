package com.myskoolclub.backend.service;

import com.myskoolclub.backend.dto.EventRequest;
import com.myskoolclub.backend.dto.EventResponse;
import com.myskoolclub.backend.dto.EventRsvpRequest;
import com.myskoolclub.backend.dto.EventRsvpSummaryResponse;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.AppRole;
import com.myskoolclub.backend.model.Event;
import com.myskoolclub.backend.model.EventRsvp;
import com.myskoolclub.backend.model.EventRsvpResponse;
import com.myskoolclub.backend.model.MembershipRole;
import com.myskoolclub.backend.model.MembershipStatus;
import com.myskoolclub.backend.model.School;
import com.myskoolclub.backend.model.User;
import com.myskoolclub.backend.repository.EventRepository;
import com.myskoolclub.backend.repository.EventRsvpRepository;
import com.myskoolclub.backend.repository.SchoolMembershipRepository;
import com.myskoolclub.backend.repository.SchoolRepository;
import com.myskoolclub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final EventRsvpRepository eventRsvpRepository;
    private final SchoolRepository schoolRepository;
    private final SchoolMembershipRepository schoolMembershipRepository;
    private final UserRepository userRepository;
    private final ContentSafetyService contentSafetyService;

    // ---- Reads ----

    @Transactional(readOnly = true)
    public List<EventResponse> listEvents(Long schoolId, String requesterEmail) {
        User requester = requireUser(requesterEmail);
        List<Event> events = eventRepository.findBySchoolIdOrderByEventTimeAsc(schoolId);
        if (events.isEmpty()) return List.of();

        List<Long> eventIds = events.stream().map(Event::getId).toList();

        Map<Long, Map<EventRsvpResponse, Long>> counts = new HashMap<>();
        for (Object[] row : eventRsvpRepository.countsByEventIds(eventIds)) {
            Long eventId = (Long) row[0];
            EventRsvpResponse response = (EventRsvpResponse) row[1];
            Long count = (Long) row[2];
            counts.computeIfAbsent(eventId, k -> new EnumMap<>(EventRsvpResponse.class)).put(response, count);
        }

        Map<Long, EventRsvpResponse> myResponses = eventRsvpRepository
                .findByEvent_IdInAndUser_Id(eventIds, requester.getId()).stream()
                .collect(Collectors.toMap(r -> r.getEvent().getId(), EventRsvp::getResponse));

        return events.stream()
                .map(e -> {
                    Map<EventRsvpResponse, Long> c = counts.getOrDefault(e.getId(), Map.of());
                    return EventResponse.summary(
                            e,
                            c.getOrDefault(EventRsvpResponse.YES, 0L),
                            c.getOrDefault(EventRsvpResponse.NO, 0L),
                            c.getOrDefault(EventRsvpResponse.MAYBE, 0L),
                            myResponses.get(e.getId())
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public EventResponse getEvent(Long schoolId, Long eventId, String requesterEmail) {
        User requester = requireUser(requesterEmail);
        Event event = requireEventInSchool(schoolId, eventId);
        return toDetailResponse(event, requester);
    }

    // ---- Create / delete (any school member creates; creator or school/app admin deletes) ----

    @Transactional
    public EventResponse createEvent(Long schoolId, EventRequest request, String requesterEmail) {
        contentSafetyService.requireAllowed(request.title(), request.location());
        School school = requireSchool(schoolId);
        User creator = requireUser(requesterEmail);

        Event event = Event.builder()
                .school(school)
                .createdBy(creator)
                .title(request.title())
                .location(request.location())
                .eventTime(request.eventTime())
                .build();

        Event saved = eventRepository.save(event);
        return EventResponse.summary(saved, 0, 0, 0, null);
    }

    @Transactional
    public void deleteEvent(Long schoolId, Long eventId, String requesterEmail) {
        Event event = requireEventInSchool(schoolId, eventId);
        User requester = requireUser(requesterEmail);

        boolean isOwner = event.getCreatedBy().getId().equals(requester.getId());
        if (!isOwner && !isSchoolAdmin(event.getSchool(), requester)) {
            throw new AppException(HttpStatus.FORBIDDEN, "You do not have permission to delete this event");
        }
        eventRepository.delete(event);
    }

    // ---- RSVP (any school member; one response per user per event, upserted) ----

    @Transactional
    public EventResponse rsvp(Long schoolId, Long eventId, EventRsvpRequest request, String requesterEmail) {
        Event event = requireEventInSchool(schoolId, eventId);
        User requester = requireUser(requesterEmail);

        EventRsvp rsvp = eventRsvpRepository.findByEvent_IdAndUser_Id(eventId, requester.getId())
                .orElseGet(() -> EventRsvp.builder().event(event).user(requester).build());
        rsvp.setResponse(request.response());
        rsvp.setRespondedAt(LocalDateTime.now());
        eventRsvpRepository.save(rsvp);

        return toDetailResponse(event, requester);
    }

    // ---- Helpers ----

    private EventResponse toDetailResponse(Event event, User requester) {
        List<EventRsvp> rsvps = eventRsvpRepository.findByEventIdOrderByRespondedAtAsc(event.getId());

        long yes = rsvps.stream().filter(r -> r.getResponse() == EventRsvpResponse.YES).count();
        long no = rsvps.stream().filter(r -> r.getResponse() == EventRsvpResponse.NO).count();
        long maybe = rsvps.stream().filter(r -> r.getResponse() == EventRsvpResponse.MAYBE).count();
        EventRsvpResponse mine = rsvps.stream()
                .filter(r -> r.getUser().getId().equals(requester.getId()))
                .map(EventRsvp::getResponse)
                .findFirst().orElse(null);

        List<EventRsvpSummaryResponse> summaries = rsvps.stream().map(EventRsvpSummaryResponse::from).toList();
        return EventResponse.detail(event, yes, no, maybe, mine, summaries);
    }

    /** APP_ADMIN or SCHOOL_ADMIN of this school. */
    private boolean isSchoolAdmin(School school, User user) {
        if (user.getAppRole() == AppRole.APP_ADMIN) return true;
        var membership = schoolMembershipRepository
                .findByUserIdAndSchoolId(user.getId(), school.getId())
                .orElse(null);
        return membership != null
                && membership.getStatus() == MembershipStatus.APPROVED
                && membership.getRole() == MembershipRole.ADMIN;
    }

    private Event requireEventInSchool(Long schoolId, Long eventId) {
        Event event = eventRepository.findByIdWithDetails(eventId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Event not found"));
        if (!event.getSchool().getId().equals(schoolId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Event not found");
        }
        return event;
    }

    private School requireSchool(Long schoolId) {
        return schoolRepository.findById(schoolId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "School not found"));
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
