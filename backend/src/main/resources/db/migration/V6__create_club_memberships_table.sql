CREATE TABLE club_memberships (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    club_id      BIGINT      NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    role         VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    status       VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at  TIMESTAMP,
    reviewed_by  BIGINT REFERENCES users(id),
    UNIQUE (user_id, club_id)
);

CREATE INDEX idx_club_memberships_club_status ON club_memberships(club_id, status);
CREATE INDEX idx_club_memberships_user ON club_memberships(user_id);
