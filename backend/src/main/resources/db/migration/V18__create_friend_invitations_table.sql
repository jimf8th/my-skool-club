CREATE TABLE friend_invitations (
    id                           BIGSERIAL PRIMARY KEY,
    invited_by                  BIGINT REFERENCES users(id) ON DELETE SET NULL,
    email                       VARCHAR(320) NOT NULL,
    first_name                  VARCHAR(100) NOT NULL,
    last_name                   VARCHAR(100) NOT NULL,
    token_hash                  VARCHAR(64) NOT NULL UNIQUE,
    expires_at                  TIMESTAMP NOT NULL,
    verification_code_hash     VARCHAR(255),
    verification_code_expires_at TIMESTAMP,
    verification_code_sent_at  TIMESTAMP,
    verification_attempt_count INTEGER NOT NULL DEFAULT 0,
    accepted_at                 TIMESTAMP,
    revoked_at                  TIMESTAMP,
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_friend_invitations_email_active
    ON friend_invitations (LOWER(email), accepted_at, revoked_at);

CREATE INDEX idx_friend_invitations_inviter_created
    ON friend_invitations (invited_by, created_at DESC);
