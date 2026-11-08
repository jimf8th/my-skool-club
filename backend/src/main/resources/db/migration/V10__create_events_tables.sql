CREATE TABLE events (
    id           BIGSERIAL PRIMARY KEY,
    school_id    BIGINT NOT NULL REFERENCES schools(id),
    created_by   BIGINT NOT NULL REFERENCES users(id),
    title        VARCHAR(200) NOT NULL,
    location     VARCHAR(300) NOT NULL,
    event_time   TIMESTAMP NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_school_id ON events(school_id);
CREATE INDEX idx_events_event_time ON events(event_time);

-- One RSVP per user per event; re-responding updates the existing row.
CREATE TABLE event_rsvps (
    id            BIGSERIAL PRIMARY KEY,
    event_id      BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id       BIGINT NOT NULL REFERENCES users(id),
    response      VARCHAR(10) NOT NULL,
    responded_at  TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_user_id ON event_rsvps(user_id);
