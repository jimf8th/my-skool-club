CREATE TABLE password_reset_codes (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token         VARCHAR(255) NOT NULL,
    expires_at    TIMESTAMP NOT NULL,
    used          BOOLEAN NOT NULL DEFAULT FALSE,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_user_active_created
    ON password_reset_codes(user_id, used, created_at DESC);
