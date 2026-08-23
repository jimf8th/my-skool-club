ALTER TABLE users
    ADD COLUMN suspended_at TIMESTAMP,
    ADD COLUMN suspended_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN suspension_reason TEXT;

CREATE TABLE content_reports (
    id               BIGSERIAL PRIMARY KEY,
    reporter_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type     VARCHAR(30) NOT NULL,
    content_id       BIGINT NOT NULL,
    content_author_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reason           VARCHAR(40) NOT NULL,
    details          VARCHAR(1000),
    content_snapshot TEXT NOT NULL,
    status           VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    resolution       VARCHAR(1000),
    reviewed_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at      TIMESTAMP,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_content_reports_status_created
    ON content_reports(status, created_at DESC);
CREATE INDEX idx_content_reports_reporter_created
    ON content_reports(reporter_id, created_at DESC);
CREATE INDEX idx_content_reports_target
    ON content_reports(content_type, content_id);
