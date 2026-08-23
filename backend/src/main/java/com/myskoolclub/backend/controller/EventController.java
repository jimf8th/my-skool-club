package com.myskoolclub.backend.controller;

import com.myskoolclub.backend.dto.EventRequest;
import com.myskoolclub.backend.dto.EventResponse;
import com.myskoolclub.backend.dto.EventRsvpRequest;
import com.myskoolclub.backend.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    /** List events for a school, soonest first. Requires VIEW_EVENTS (any approved school member or above). */
    @GetMapping("/api/schools/{schoolId}/events")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'VIEW_EVENTS')")
    public ResponseEntity<List<EventResponse>> listEvents(@PathVariable Long schoolId, Authentication auth) {
        return ResponseEntity.ok(eventService.listEvents(schoolId, auth.getName()));
    }

    /** Get full event detail, including the per-attendee RSVP list. Requires VIEW_EVENTS. */
    @GetMapping("/api/schools/{schoolId}/events/{eventId}")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'VIEW_EVENTS')")
    public ResponseEntity<EventResponse> getEvent(
            @PathVariable Long schoolId, @PathVariable Long eventId, Authentication auth) {
        return ResponseEntity.ok(eventService.getEvent(schoolId, eventId, auth.getName()));
    }

    /** Create an event. Requires CREATE_EVENT (any approved school member or above). */
    @PostMapping("/api/schools/{schoolId}/events")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'CREATE_EVENT')")
    public ResponseEntity<EventResponse> createEvent(
            @PathVariable Long schoolId, @Valid @RequestBody EventRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.createEvent(schoolId, request, auth.getName()));
    }

    /** Delete an event. Only the creator or a school/app admin (service-enforced). */
    @DeleteMapping("/api/schools/{schoolId}/events/{eventId}")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'CREATE_EVENT')")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable Long schoolId, @PathVariable Long eventId, Authentication auth) {
        eventService.deleteEvent(schoolId, eventId, auth.getName());
        return ResponseEntity.noContent().build();
    }

    /** RSVP yes/no/maybe to an event. Requires RSVP_EVENT (any approved school member or above). */
    @PostMapping("/api/schools/{schoolId}/events/{eventId}/rsvp")
    @PreAuthorize("@sec.hasSchoolPrivilege(authentication, #schoolId, 'RSVP_EVENT')")
    public ResponseEntity<EventResponse> rsvp(
            @PathVariable Long schoolId, @PathVariable Long eventId,
            @Valid @RequestBody EventRsvpRequest request, Authentication auth) {
        return ResponseEntity.ok(eventService.rsvp(schoolId, eventId, request, auth.getName()));
    }
}
