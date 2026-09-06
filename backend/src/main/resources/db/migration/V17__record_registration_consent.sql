ALTER TABLE users
    ADD COLUMN age_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN terms_accepted_at TIMESTAMP,
    ADD COLUMN terms_version VARCHAR(20);
