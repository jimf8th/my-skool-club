-- Mock invoice data for the Arizona Cardinals Club (club_id = 2)
-- Creators/approvers restricted to approved club members:
--   James Connor  (user_id 6, MEMBER)
--   Michael Wilson (user_id 8, MEMBER)
--   Walter Nolan   (user_id 9, MEMBER)
--   Kyler Murray   (user_id 7, ADMIN)  -- only account that approves/pays

BEGIN;

-- ============================================================
-- Invoice 1: DRAFT — created by James Connor, not yet submitted
-- ============================================================
INSERT INTO invoices (club_id, created_by, title, notes, payment_required,
                       payee_name, payee_email, total_amount, status,
                       created_at, updated_at)
VALUES (2, 6, 'Team Travel Reimbursement - Away Game vs Hawks',
        'Mileage, hotel, and meals for the away scrimmage trip.', true,
        'James Connor', 'james.connor@dummy.com', 0, 'DRAFT',
        now() - interval '2 days', now() - interval '2 days')
RETURNING id AS inv1_id \gset

INSERT INTO invoice_line_items (invoice_id, line_order, description, quantity, unit_price, total_price) VALUES
(:inv1_id, 1, 'Mileage reimbursement (van rental)', 1, 180.00, 180.00),
(:inv1_id, 2, 'Hotel - 1 night (team block)',        1, 420.00, 420.00),
(:inv1_id, 3, 'Team meals (dinner + breakfast)',      1, 260.50, 260.50);

UPDATE invoices SET total_amount = 860.50 WHERE id = :inv1_id;

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, note, performed_at)
VALUES (:inv1_id, 'CREATED', 6, NULL, 'DRAFT', NULL, now() - interval '2 days');

-- ============================================================
-- Invoice 2: SUBMITTED — created by Michael Wilson, awaiting review
-- ============================================================
INSERT INTO invoices (club_id, created_by, title, notes, payment_required,
                       payee_name, payee_email, total_amount, status,
                       submitted_at, created_at, updated_at)
VALUES (2, 8, 'Practice Equipment - Cones, Bibs & Water Jugs',
        'Restocking practice gear for the second half of the season.', true,
        'Michael Wilson', 'michael.wilson@dummy.com', 0, 'SUBMITTED',
        now() - interval '5 days', now() - interval '6 days', now() - interval '5 days')
RETURNING id AS inv2_id \gset

INSERT INTO invoice_line_items (invoice_id, line_order, description, quantity, unit_price, total_price) VALUES
(:inv2_id, 1, 'Agility cones (set of 20)',       1, 85.00,  85.00),
(:inv2_id, 2, 'Scrimmage bibs (pack of 12)',     1, 150.75, 150.75),
(:inv2_id, 3, 'Water jugs (5 gallon, insulated)', 5, 22.50, 112.50);

UPDATE invoices SET total_amount = 348.25 WHERE id = :inv2_id;

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, note, performed_at) VALUES
(:inv2_id, 'CREATED',   8, NULL,   'DRAFT',     NULL, now() - interval '6 days'),
(:inv2_id, 'SUBMITTED', 8, 'DRAFT', 'SUBMITTED', NULL, now() - interval '5 days');

-- ============================================================
-- Invoice 3: APPROVED — created by Walter Nolan, approved by Kyler Murray
-- ============================================================
INSERT INTO invoices (club_id, created_by, title, notes, payment_required,
                       payee_name, payee_email, total_amount, status,
                       submitted_at, approved_at, approved_by,
                       created_at, updated_at)
VALUES (2, 9, 'Referee Fees - Weekend Scrimmage',
        'Officiating fees plus field marking for the scrimmage.', true,
        'Arizona High School Officials Assoc.', 'billing@azofficials-dummy.com',
        0, 'APPROVED',
        now() - interval '9 days', now() - interval '8 days', 7,
        now() - interval '10 days', now() - interval '8 days')
RETURNING id AS inv3_id \gset

INSERT INTO invoice_line_items (invoice_id, line_order, description, quantity, unit_price, total_price) VALUES
(:inv3_id, 1, 'Referee fee', 3, 75.00, 225.00),
(:inv3_id, 2, 'Field marking / chalk lines', 1, 40.00, 40.00);

UPDATE invoices SET total_amount = 265.00 WHERE id = :inv3_id;

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, note, performed_at) VALUES
(:inv3_id, 'CREATED',   9, NULL,       'DRAFT',     NULL, now() - interval '10 days'),
(:inv3_id, 'SUBMITTED', 9, 'DRAFT',    'SUBMITTED', NULL, now() - interval '9 days'),
(:inv3_id, 'APPROVED',  7, 'SUBMITTED','APPROVED',  NULL, now() - interval '8 days');

-- ============================================================
-- Invoice 4: PAID — created by James Connor, approved & paid by Kyler Murray
-- ============================================================
INSERT INTO invoices (club_id, created_by, title, notes, payment_required,
                       payee_name, payee_email, total_amount, status,
                       submitted_at, approved_at, approved_by, paid_at, paid_by,
                       created_at, updated_at)
VALUES (2, 6, 'Team Banquet Catering',
        'End-of-season banquet catering, decorations, and printed programs.', true,
        'Desert Bloom Catering Co.', 'events@desertbloom-dummy.com',
        0, 'PAID',
        now() - interval '19 days', now() - interval '17 days', 7,
        now() - interval '15 days', 7,
        now() - interval '20 days', now() - interval '15 days')
RETURNING id AS inv4_id \gset

INSERT INTO invoice_line_items (invoice_id, line_order, description, quantity, unit_price, total_price) VALUES
(:inv4_id, 1, 'Banquet catering (per guest)', 60, 18.50, 1110.00),
(:inv4_id, 2, 'Decorations',                   1, 150.00, 150.00),
(:inv4_id, 3, 'Printed programs',              60, 2.25,  135.00);

UPDATE invoices SET total_amount = 1395.00 WHERE id = :inv4_id;

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, note, performed_at) VALUES
(:inv4_id, 'CREATED',     6, NULL,        'DRAFT',     NULL, now() - interval '20 days'),
(:inv4_id, 'SUBMITTED',   6, 'DRAFT',     'SUBMITTED', NULL, now() - interval '19 days'),
(:inv4_id, 'APPROVED',    7, 'SUBMITTED', 'APPROVED',  NULL, now() - interval '17 days'),
(:inv4_id, 'MARKED_PAID', 7, 'APPROVED',  'PAID',      NULL, now() - interval '15 days');

-- ============================================================
-- Invoice 5: CANCELLED — created and cancelled by Michael Wilson (owner)
-- ============================================================
INSERT INTO invoices (club_id, created_by, title, notes, payment_required,
                       payee_name, payee_email, total_amount, status,
                       submitted_at, cancellation_reason, cancelled_at, cancelled_by,
                       created_at, updated_at)
VALUES (2, 8, 'Practice Jerseys - Reorder',
        'Replacement practice jerseys with number decals.', true,
        'ProSport Team Gear', 'orders@prosportgear-dummy.com',
        0, 'CANCELLED',
        now() - interval '11 days',
        'Vendor cancelled the order before purchase was finalized.',
        now() - interval '10 days', 8,
        now() - interval '12 days', now() - interval '10 days')
RETURNING id AS inv5_id \gset

INSERT INTO invoice_line_items (invoice_id, line_order, description, quantity, unit_price, total_price) VALUES
(:inv5_id, 1, 'Practice jerseys', 15, 32.00, 480.00),
(:inv5_id, 2, 'Number decals',    15, 6.00,  90.00);

UPDATE invoices SET total_amount = 570.00 WHERE id = :inv5_id;

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, note, performed_at) VALUES
(:inv5_id, 'CREATED',   8, NULL,        'DRAFT',     NULL, now() - interval '12 days'),
(:inv5_id, 'SUBMITTED', 8, 'DRAFT',     'SUBMITTED', NULL, now() - interval '11 days'),
(:inv5_id, 'CANCELLED', 8, 'SUBMITTED', 'CANCELLED', 'Vendor cancelled the order before purchase was finalized.', now() - interval '10 days');

COMMIT;
