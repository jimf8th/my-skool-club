ALTER TABLE schools
    ADD COLUMN address VARCHAR(255),
    ADD COLUMN city VARCHAR(120),
    ADD COLUMN state VARCHAR(120),
    ADD COLUMN postal_code VARCHAR(30),
    ADD COLUMN website VARCHAR(500),
    ADD COLUMN phone VARCHAR(40);

CREATE TABLE school_requests (
    id              BIGSERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    contact_phone   VARCHAR(40) NOT NULL,
    admin_email     VARCHAR(320) NOT NULL,
    school_name     VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    address         VARCHAR(255) NOT NULL,
    city            VARCHAR(120) NOT NULL,
    state           VARCHAR(120) NOT NULL,
    postal_code     VARCHAR(30) NOT NULL,
    website         VARCHAR(500) NOT NULL,
    school_phone    VARCHAR(40) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    reviewed_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMP,
    created_school_id BIGINT REFERENCES schools(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_school_requests_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX idx_school_requests_status_created
    ON school_requests (status, created_at DESC);

CREATE INDEX idx_school_requests_admin_email
    ON school_requests (LOWER(admin_email), created_at DESC);

ALTER TABLE friend_invitations
    ADD COLUMN school_id BIGINT REFERENCES schools(id) ON DELETE SET NULL;
