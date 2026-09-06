CREATE TABLE inventory_items (
    id            BIGSERIAL PRIMARY KEY,
    club_id       BIGINT NOT NULL REFERENCES clubs(id),
    created_by    BIGINT NOT NULL REFERENCES users(id),
    name          VARCHAR(200) NOT NULL,
    description   TEXT,
    category      VARCHAR(100),
    serial_number VARCHAR(100),
    status        VARCHAR(20) NOT NULL DEFAULT 'CHECKED_IN',
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP
);

CREATE INDEX idx_inventory_items_club_id ON inventory_items(club_id);
CREATE INDEX idx_inventory_items_status ON inventory_items(status);

-- Every checkout of an item gets a row here. While an item is out, its most
-- recent row has checked_in_at IS NULL; check-in closes that row. The full
-- table doubles as the item's checkout history / audit trail.
CREATE TABLE inventory_checkouts (
    id             BIGSERIAL PRIMARY KEY,
    item_id        BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    checked_out_by BIGINT NOT NULL REFERENCES users(id),
    checked_out_at TIMESTAMP NOT NULL DEFAULT now(),
    due_date       DATE,
    checkout_notes TEXT,
    checked_in_by  BIGINT REFERENCES users(id),
    checked_in_at  TIMESTAMP,
    checkin_notes  TEXT
);

CREATE INDEX idx_inventory_checkouts_item_id ON inventory_checkouts(item_id);
CREATE INDEX idx_inventory_checkouts_checked_out_by ON inventory_checkouts(checked_out_by);
