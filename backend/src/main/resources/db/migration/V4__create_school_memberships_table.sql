-- role:   MEMBER | ADMIN
-- status: PENDING | APPROVED | REJECTED | REVOKED
CREATE TABLE school_memberships (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id    BIGINT      NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    role         VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    status       VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at  TIMESTAMP,
    reviewed_by  BIGINT REFERENCES users(id),
    UNIQUE (user_id, school_id)
);

CREATE INDEX idx_school_memberships_school_status ON school_memberships(school_id, status);
CREATE INDEX idx_school_memberships_user ON school_memberships(user_id);
