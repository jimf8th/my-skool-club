ALTER TABLE email_verifications
    ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;

-- Tokens created before this migration were long-lived links. Invalidate them
-- so all active verifications use the new short-lived, hashed code flow.
UPDATE email_verifications
SET used = TRUE
WHERE used = FALSE;

CREATE INDEX idx_email_verifications_user_active_created
    ON email_verifications(user_id, used, created_at DESC);
