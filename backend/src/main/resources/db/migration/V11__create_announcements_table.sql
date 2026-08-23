CREATE TABLE announcements (
    id           BIGSERIAL PRIMARY KEY,
    school_id    BIGINT NOT NULL REFERENCES schools(id),
    created_by   BIGINT NOT NULL REFERENCES users(id),
    title        VARCHAR(200) NOT NULL,
    body         VARCHAR(4000) NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_school_id ON announcements(school_id);
CREATE INDEX idx_announcements_created_at ON announcements(created_at);
