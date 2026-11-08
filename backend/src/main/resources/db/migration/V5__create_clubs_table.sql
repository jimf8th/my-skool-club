CREATE TABLE clubs (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    school_id   BIGINT       NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by  BIGINT       NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP,
    UNIQUE (name, school_id)
);

CREATE INDEX idx_clubs_school_id ON clubs(school_id);
