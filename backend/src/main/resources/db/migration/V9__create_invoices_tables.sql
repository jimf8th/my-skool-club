CREATE TABLE invoices (
    id                   BIGSERIAL PRIMARY KEY,
    club_id              BIGINT NOT NULL REFERENCES clubs(id),
    created_by           BIGINT NOT NULL REFERENCES users(id),
    title                VARCHAR(200) NOT NULL,
    notes                TEXT,
    payment_required     BOOLEAN NOT NULL DEFAULT TRUE,
    payee_name           VARCHAR(200),
    payee_email          VARCHAR(200),
    total_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
    status               VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    rejection_reason     TEXT,
    cancellation_reason  TEXT,
    submitted_at         TIMESTAMP,
    approved_at          TIMESTAMP,
    approved_by          BIGINT REFERENCES users(id),
    paid_at              TIMESTAMP,
    paid_by              BIGINT REFERENCES users(id),
    cancelled_at         TIMESTAMP,
    cancelled_by         BIGINT REFERENCES users(id),
    created_at           TIMESTAMP NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP
);

CREATE INDEX idx_invoices_club_id ON invoices(club_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created_by ON invoices(created_by);

CREATE TABLE invoice_line_items (
    id            BIGSERIAL PRIMARY KEY,
    invoice_id    BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    line_order    INT NOT NULL,
    description   VARCHAR(300) NOT NULL,
    quantity      INT NOT NULL,
    unit_price    NUMERIC(12,2) NOT NULL,
    total_price   NUMERIC(12,2) NOT NULL
);

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- Complete audit trail: every state transition (created, submitted, sent back,
-- approved, marked paid, cancelled) is recorded here with who performed it and when.
CREATE TABLE invoice_audit_logs (
    id               BIGSERIAL PRIMARY KEY,
    invoice_id       BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    action           VARCHAR(30) NOT NULL,
    performed_by     BIGINT NOT NULL REFERENCES users(id),
    previous_status  VARCHAR(20),
    new_status       VARCHAR(20),
    note             TEXT,
    performed_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_audit_logs_invoice_id ON invoice_audit_logs(invoice_id);
