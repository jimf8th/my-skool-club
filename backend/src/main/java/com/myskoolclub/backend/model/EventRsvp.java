package com.myskoolclub.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** A single school member's RSVP to a single event. Unique per (event, user). */
@Entity
@Table(name = "event_rsvps", uniqueConstraints = @UniqueConstraint(columnNames = {"event_id", "user_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventRsvp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventRsvpResponse response;

    @Column(name = "responded_at", nullable = false)
    private LocalDateTime respondedAt;
}
