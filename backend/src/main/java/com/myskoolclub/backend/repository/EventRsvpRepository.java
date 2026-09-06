package com.myskoolclub.backend.repository;

import com.myskoolclub.backend.model.EventRsvp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EventRsvpRepository extends JpaRepository<EventRsvp, Long> {

    @Query("SELECT r FROM EventRsvp r JOIN FETCH r.user WHERE r.event.id = :eventId ORDER BY r.respondedAt ASC")
    List<EventRsvp> findByEventIdOrderByRespondedAtAsc(@Param("eventId") Long eventId);

    Optional<EventRsvp> findByEvent_IdAndUser_Id(Long eventId, Long userId);

    List<EventRsvp> findByEvent_IdInAndUser_Id(List<Long> eventIds, Long userId);

    /** Row shape: [eventId (Long), response (EventRsvpResponse), count (Long)]. */
    @Query("SELECT r.event.id, r.response, COUNT(r) FROM EventRsvp r WHERE r.event.id IN :eventIds GROUP BY r.event.id, r.response")
    List<Object[]> countsByEventIds(@Param("eventIds") List<Long> eventIds);
}
