\set ON_ERROR_STOP on

-- Production reads the password from a Secret Manager-backed environment
-- variable so it never appears in the Cloud Run Job's process arguments.
-- The local wrapper may still provide the psql variable directly.
\if :{?demo_password}
\else
\getenv demo_password DEMO_PASSWORD
\endif

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Reserved screenshot identities. Existing rows are refreshed in place so
-- unrelated memberships belonging to unrelated local users are untouched.
INSERT INTO users (
    email, password, first_name, last_name, graduation_year, app_role,
    email_verified, enabled, age_confirmed, terms_accepted_at, terms_version,
    created_at, updated_at
)
VALUES
    ('app.admin@cypressridge.test', crypt(:'demo_password', gen_salt('bf', 10)),
     'Avery', 'Brooks', NULL, 'APP_ADMIN', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '120 days', CURRENT_TIMESTAMP),
    ('school.admin@cypressridge.test', crypt(:'demo_password', gen_salt('bf', 10)),
     'Jordan', 'Lee', NULL, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '110 days', CURRENT_TIMESTAMP),
    ('robotics.admin@cypressridge.test', crypt(:'demo_password', gen_salt('bf', 10)),
     'Maya', 'Patel', 2027, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '95 days', CURRENT_TIMESTAMP),
    ('arts.admin@cypressridge.test', crypt(:'demo_password', gen_salt('bf', 10)),
     'Sofia', 'Martinez', 2028, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP),
    ('member@cypressridge.test', crypt(:'demo_password', gen_salt('bf', 10)),
     'Ethan', 'Williams', 2027, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '70 days', CURRENT_TIMESTAMP),
    ('pending@cypressridge.test', crypt(:'demo_password', gen_salt('bf', 10)),
     'Chloe', 'Kim', 2029, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP),
    ('club.pending@cypressridge.test', crypt(:'demo_password', gen_salt('bf', 10)),
     'Noah', 'Singh', 2028, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP),
    ('school.rejected@cypressridge.test', crypt(:'demo_password', gen_salt('bf', 10)),
     'Olivia', 'Chen', 2029, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP),
    ('club.rejected@cypressridge.test', crypt(:'demo_password', gen_salt('bf', 10)),
     'Liam', 'Garcia', 2027, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP),
    ('deletion@cypressridge.test', crypt(:'demo_password', gen_salt('bf', 10)),
     'Taylor', 'Reed', NULL, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    graduation_year = EXCLUDED.graduation_year,
    app_role = EXCLUDED.app_role,
    email_verified = TRUE,
    enabled = TRUE,
    suspended_at = NULL,
    suspended_by = NULL,
    suspension_reason = NULL,
    age_confirmed = TRUE,
    terms_accepted_at = CURRENT_TIMESTAMP,
    terms_version = EXCLUDED.terms_version,
    updated_at = CURRENT_TIMESTAMP;

SELECT id AS app_admin_id FROM users WHERE email = 'app.admin@cypressridge.test' \gset
SELECT id AS school_admin_id FROM users WHERE email = 'school.admin@cypressridge.test' \gset
SELECT id AS robotics_admin_id FROM users WHERE email = 'robotics.admin@cypressridge.test' \gset
SELECT id AS arts_admin_id FROM users WHERE email = 'arts.admin@cypressridge.test' \gset
SELECT id AS member_id FROM users WHERE email = 'member@cypressridge.test' \gset
SELECT id AS pending_id FROM users WHERE email = 'pending@cypressridge.test' \gset
SELECT id AS club_pending_id FROM users WHERE email = 'club.pending@cypressridge.test' \gset
SELECT id AS school_rejected_id FROM users WHERE email = 'school.rejected@cypressridge.test' \gset
SELECT id AS club_rejected_id FROM users WHERE email = 'club.rejected@cypressridge.test' \gset
SELECT id AS deletion_id FROM users WHERE email = 'deletion@cypressridge.test' \gset

INSERT INTO schools (name, description, enabled, tier, created_by, created_at, updated_at)
VALUES (
    'Cypress Ridge Academy',
    'A vibrant, future-focused school where curiosity, creativity, service, and student leadership come together.',
    TRUE,
    'PREMIUM',
    :app_admin_id,
    CURRENT_TIMESTAMP - INTERVAL '100 days',
    CURRENT_TIMESTAMP
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    enabled = TRUE,
    tier = EXCLUDED.tier,
    created_by = EXCLUDED.created_by,
    updated_at = CURRENT_TIMESTAMP;

SELECT id AS school_id FROM schools WHERE name = 'Cypress Ridge Academy' \gset

-- Remove only records owned by this named demo school before recreating them.
-- Tables without cascading foreign keys are cleared from the leaves inward.
DELETE FROM content_reports
WHERE (content_type = 'SCHOOL' AND content_id = :school_id)
   OR (content_type = 'CLUB' AND content_id IN (SELECT id FROM clubs WHERE school_id = :school_id))
   OR (content_type = 'EVENT' AND content_id IN (SELECT id FROM events WHERE school_id = :school_id))
   OR (content_type = 'ANNOUNCEMENT' AND content_id IN (SELECT id FROM announcements WHERE school_id = :school_id));

DELETE FROM inventory_checkouts
WHERE item_id IN (
    SELECT inventory_items.id
    FROM inventory_items
    JOIN clubs ON clubs.id = inventory_items.club_id
    WHERE clubs.school_id = :school_id
);
DELETE FROM inventory_items
WHERE club_id IN (SELECT id FROM clubs WHERE school_id = :school_id);

DELETE FROM invoice_audit_logs
WHERE invoice_id IN (
    SELECT invoices.id
    FROM invoices
    JOIN clubs ON clubs.id = invoices.club_id
    WHERE clubs.school_id = :school_id
);
DELETE FROM invoice_line_items
WHERE invoice_id IN (
    SELECT invoices.id
    FROM invoices
    JOIN clubs ON clubs.id = invoices.club_id
    WHERE clubs.school_id = :school_id
);
DELETE FROM invoices
WHERE club_id IN (SELECT id FROM clubs WHERE school_id = :school_id);

DELETE FROM club_memberships
WHERE club_id IN (SELECT id FROM clubs WHERE school_id = :school_id);
DELETE FROM clubs WHERE school_id = :school_id;

DELETE FROM event_rsvps
WHERE event_id IN (SELECT id FROM events WHERE school_id = :school_id);
DELETE FROM events WHERE school_id = :school_id;
DELETE FROM announcements WHERE school_id = :school_id;
DELETE FROM school_memberships WHERE school_id = :school_id;
DELETE FROM notifications
WHERE user_id IN (
    :app_admin_id, :school_admin_id, :robotics_admin_id, :arts_admin_id,
    :member_id, :pending_id, :club_pending_id, :school_rejected_id,
    :club_rejected_id, :deletion_id
);

-- School roles: application admin, school admin, approved members, and a
-- pending membership request for an admin-review screenshot.
INSERT INTO school_memberships (
    user_id, school_id, role, status, requested_at, reviewed_at, reviewed_by
)
VALUES
    (:app_admin_id, :school_id, 'MEMBER', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '99 days', CURRENT_TIMESTAMP - INTERVAL '99 days', :school_admin_id),
    (:school_admin_id, :school_id, 'ADMIN', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '98 days', CURRENT_TIMESTAMP - INTERVAL '98 days', :app_admin_id),
    (:robotics_admin_id, :school_id, 'MEMBER', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '89 days', :school_admin_id),
    (:arts_admin_id, :school_id, 'MEMBER', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '88 days', CURRENT_TIMESTAMP - INTERVAL '87 days', :school_admin_id),
    (:member_id, :school_id, 'MEMBER', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '65 days', CURRENT_TIMESTAMP - INTERVAL '64 days', :school_admin_id),
    (:pending_id, :school_id, 'MEMBER', 'PENDING', CURRENT_TIMESTAMP - INTERVAL '1 day', NULL, NULL),
    (:club_pending_id, :school_id, 'MEMBER', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '11 days', CURRENT_TIMESTAMP - INTERVAL '10 days', :school_admin_id),
    (:school_rejected_id, :school_id, 'MEMBER', 'REJECTED', CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP - INTERVAL '8 days', :school_admin_id),
    (:club_rejected_id, :school_id, 'MEMBER', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '19 days', CURRENT_TIMESTAMP - INTERVAL '18 days', :school_admin_id);

INSERT INTO clubs (name, description, school_id, created_by, created_at, updated_at)
VALUES
    ('Robotics & Innovation Club',
     'Design, build, code, and compete while turning ambitious ideas into working prototypes.',
     :school_id, :school_admin_id, CURRENT_TIMESTAMP - INTERVAL '86 days', CURRENT_TIMESTAMP),
    ('Creative Arts Society',
     'A welcoming studio for visual art, ceramics, design, photography, performance, and student exhibitions.',
     :school_id, :school_admin_id, CURRENT_TIMESTAMP - INTERVAL '82 days', CURRENT_TIMESTAMP);

SELECT id AS robotics_club_id FROM clubs WHERE school_id = :school_id AND name = 'Robotics & Innovation Club' \gset
SELECT id AS arts_club_id FROM clubs WHERE school_id = :school_id AND name = 'Creative Arts Society' \gset

INSERT INTO club_memberships (
    user_id, club_id, role, status, requested_at, reviewed_at, reviewed_by
)
VALUES
    (:robotics_admin_id, :robotics_club_id, 'ADMIN', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '84 days', CURRENT_TIMESTAMP - INTERVAL '84 days', :school_admin_id),
    (:member_id, :robotics_club_id, 'MEMBER', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '59 days', :robotics_admin_id),
    (:arts_admin_id, :robotics_club_id, 'MEMBER', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '44 days', :robotics_admin_id),
    (:club_pending_id, :robotics_club_id, 'MEMBER', 'PENDING', CURRENT_TIMESTAMP - INTERVAL '8 hours', NULL, NULL),
    (:club_rejected_id, :robotics_club_id, 'MEMBER', 'REJECTED', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '6 days', :robotics_admin_id),
    (:arts_admin_id, :arts_club_id, 'ADMIN', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '80 days', CURRENT_TIMESTAMP - INTERVAL '80 days', :school_admin_id),
    (:member_id, :arts_club_id, 'MEMBER', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '55 days', CURRENT_TIMESTAMP - INTERVAL '54 days', :arts_admin_id),
    (:robotics_admin_id, :arts_club_id, 'MEMBER', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP - INTERVAL '39 days', :arts_admin_id),
    (:school_admin_id, :arts_club_id, 'MEMBER', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '36 days', CURRENT_TIMESTAMP - INTERVAL '35 days', :arts_admin_id);

-- Announcements are backdated just enough to produce a visually varied feed.
INSERT INTO announcements (school_id, created_by, title, body, created_at)
VALUES
    (:school_id, :school_admin_id, 'Welcome to a new week at Cypress Ridge',
     'This week is full of ways to connect—from club workshops to our community service project. Check the events calendar and choose something that inspires you.',
     CURRENT_TIMESTAMP - INTERVAL '3 hours'),
    (:school_id, :school_admin_id, 'Fall Club Showcase registration is open',
     'Clubs can reserve a showcase table through Friday. Bring a hands-on activity, a friendly welcome, and your best ideas for new members.',
     CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (:school_id, :school_admin_id, 'Student volunteer team: final call',
     'We still have a few spaces for Saturday morning volunteers. Service hours will be recorded and breakfast will be provided.',
     CURRENT_TIMESTAMP - INTERVAL '5 days'),
    (:school_id, :school_admin_id, 'Library collaboration spaces are now available',
     'Students may reserve the new collaboration rooms for project meetings, tutoring sessions, and club planning after school.',
     CURRENT_TIMESTAMP - INTERVAL '8 days'),
    (:school_id, :school_admin_id, 'Congratulations to our student creators',
     'The district exhibition selected twelve Cypress Ridge works this year. Thank you to every student who shared their perspective and supported a classmate.',
     CURRENT_TIMESTAMP - INTERVAL '12 days'),
    (:school_id, :school_admin_id, 'Campus reminder: bring your reusable bottle',
     'New refill stations are open in the gym, library, and arts wing as part of our student-led sustainability initiative.',
     CURRENT_TIMESTAMP - INTERVAL '16 days');

-- Dates stay in the future whenever the fixture is refreshed.
INSERT INTO events (school_id, created_by, title, location, event_time, created_at)
VALUES
    (:school_id, :school_admin_id, 'Fall Club Showcase', 'Main Courtyard', CURRENT_DATE + 3 + TIME '15:30', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    (:school_id, :robotics_admin_id, 'Robotics Open Lab', 'Innovation Lab · Room 214', CURRENT_DATE + 7 + TIME '16:00', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (:school_id, :school_admin_id, 'Family Welcome Night', 'Cypress Ridge Auditorium', CURRENT_DATE + 12 + TIME '18:00', CURRENT_TIMESTAMP - INTERVAL '6 days'),
    (:school_id, :member_id, 'Community Service Saturday', 'North Trail Community Garden', CURRENT_DATE + 18 + TIME '09:00', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (:school_id, :arts_admin_id, 'Arts Under the Stars', 'Performing Arts Lawn', CURRENT_DATE + 25 + TIME '19:00', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    (:school_id, :school_admin_id, 'Student Leadership Roundtable', 'Library Collaboration Hub', CURRENT_DATE + 32 + TIME '15:45', CURRENT_TIMESTAMP - INTERVAL '1 day');

INSERT INTO event_rsvps (event_id, user_id, response, responded_at)
SELECT event.id, response.user_id, response.response, CURRENT_TIMESTAMP - response.age
FROM events event
CROSS JOIN (VALUES
    (:school_admin_id::BIGINT, 'YES', INTERVAL '2 days'),
    (:robotics_admin_id::BIGINT, 'YES', INTERVAL '1 day'),
    (:arts_admin_id::BIGINT, 'MAYBE', INTERVAL '18 hours'),
    (:member_id::BIGINT, 'YES', INTERVAL '10 hours')
) AS response(user_id, response, age)
WHERE event.school_id = :school_id
  AND event.title IN ('Fall Club Showcase', 'Family Welcome Night', 'Community Service Saturday');

INSERT INTO event_rsvps (event_id, user_id, response, responded_at)
SELECT event.id, response.user_id, response.response, CURRENT_TIMESTAMP - response.age
FROM events event
CROSS JOIN (VALUES
    (:robotics_admin_id::BIGINT, 'YES', INTERVAL '2 days'),
    (:member_id::BIGINT, 'YES', INTERVAL '1 day'),
    (:arts_admin_id::BIGINT, 'NO', INTERVAL '12 hours')
) AS response(user_id, response, age)
WHERE event.school_id = :school_id AND event.title = 'Robotics Open Lab';

INSERT INTO event_rsvps (event_id, user_id, response, responded_at)
SELECT event.id, response.user_id, response.response, CURRENT_TIMESTAMP - response.age
FROM events event
CROSS JOIN (VALUES
    (:arts_admin_id::BIGINT, 'YES', INTERVAL '3 days'),
    (:member_id::BIGINT, 'MAYBE', INTERVAL '1 day'),
    (:school_admin_id::BIGINT, 'YES', INTERVAL '8 hours')
) AS response(user_id, response, age)
WHERE event.school_id = :school_id AND event.title = 'Arts Under the Stars';

INSERT INTO event_rsvps (event_id, user_id, response, responded_at)
SELECT event.id, response.user_id, response.response, CURRENT_TIMESTAMP - response.age
FROM events event
CROSS JOIN (VALUES
    (:school_admin_id::BIGINT, 'YES', INTERVAL '16 hours'),
    (:robotics_admin_id::BIGINT, 'MAYBE', INTERVAL '12 hours'),
    (:arts_admin_id::BIGINT, 'YES', INTERVAL '7 hours'),
    (:member_id::BIGINT, 'YES', INTERVAL '3 hours')
) AS response(user_id, response, age)
WHERE event.school_id = :school_id AND event.title = 'Student Leadership Roundtable';

-- Eight invoices span every supported status and both clubs.
INSERT INTO invoices (
    club_id, created_by, title, notes, payment_required, payee_name, payee_email,
    total_amount, status, rejection_reason, cancellation_reason, submitted_at,
    approved_at, approved_by, paid_at, paid_by, cancelled_at, cancelled_by,
    created_at, updated_at
)
VALUES
    (:robotics_club_id, :robotics_admin_id, 'Competition Sensor Kit',
     'Components for the autonomous navigation prototype.', TRUE, 'Circuit Harbor', 'orders@circuitharbor.test',
     289.90, 'DRAFT', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
     CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (:robotics_club_id, :member_id, 'Regional Tournament Registration',
     'Registration for two competition teams.', TRUE, 'State Robotics League', 'events@roboticsleague.test',
     450.00, 'SUBMITTED', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '2 days', NULL, NULL, NULL, NULL, NULL, NULL,
     CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (:robotics_club_id, :robotics_admin_id, 'Team Travel Deposit',
     'Transportation and lodging deposit for the regional tournament.', TRUE, 'Summit Student Travel', 'billing@summittravel.test',
     1275.00, 'APPROVED', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '5 days', :school_admin_id, NULL, NULL, NULL, NULL,
     CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    (:robotics_club_id, :member_id, '3D Printer Filament Restock',
     'PLA filament and delivery for prototype week.', TRUE, 'Maker Supply Co.', 'receipts@makersupply.test',
     186.75, 'PAID', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '12 days', :robotics_admin_id, CURRENT_TIMESTAMP - INTERVAL '10 days', :robotics_admin_id, NULL, NULL,
     CURRENT_TIMESTAMP - INTERVAL '16 days', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    (:robotics_club_id, :robotics_admin_id, 'Duplicate Electronics Order',
     'Cancelled after discovering the same components in storage.', TRUE, 'Circuit Harbor', 'orders@circuitharbor.test',
     94.50, 'CANCELLED', NULL, 'Duplicate order—items were already available in club inventory.', CURRENT_TIMESTAMP - INTERVAL '20 days', NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '19 days', :robotics_admin_id,
     CURRENT_TIMESTAMP - INTERVAL '22 days', CURRENT_TIMESTAMP - INTERVAL '19 days'),
    (:arts_club_id, :arts_admin_id, 'Gallery Display Materials',
     'Display boards and lighting clips for the student gallery.', TRUE, 'Creative Classroom Supply', 'hello@creativeclassroom.test',
     168.40, 'DRAFT', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
     CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (:arts_club_id, :member_id, 'Spring Production Costumes',
     'Costumes and alterations for the spring showcase.', TRUE, 'Moonlight Costume Studio', 'studio@moonlightcostume.test',
     620.00, 'SUBMITTED', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '3 days', NULL, NULL, NULL, NULL, NULL, NULL,
     CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (:arts_club_id, :arts_admin_id, 'Ceramics Studio Supplies',
     'Stoneware clay and classroom-safe glazes.', TRUE, 'Desert Clay Works', 'accounts@desertclay.test',
     347.20, 'PAID', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '18 days', CURRENT_TIMESTAMP - INTERVAL '16 days', :school_admin_id, CURRENT_TIMESTAMP - INTERVAL '14 days', :arts_admin_id, NULL, NULL,
     CURRENT_TIMESTAMP - INTERVAL '21 days', CURRENT_TIMESTAMP - INTERVAL '14 days');

INSERT INTO invoice_line_items (invoice_id, line_order, description, quantity, unit_price, total_price)
SELECT id, 1, 'Navigation controller', 1, 129.95, 129.95 FROM invoices WHERE club_id = :robotics_club_id AND title = 'Competition Sensor Kit'
UNION ALL SELECT id, 2, 'Distance sensor pack', 5, 31.99, 159.95 FROM invoices WHERE club_id = :robotics_club_id AND title = 'Competition Sensor Kit'
UNION ALL SELECT id, 1, 'Team registration fee', 2, 225.00, 450.00 FROM invoices WHERE club_id = :robotics_club_id AND title = 'Regional Tournament Registration'
UNION ALL SELECT id, 1, 'Charter bus deposit', 1, 900.00, 900.00 FROM invoices WHERE club_id = :robotics_club_id AND title = 'Team Travel Deposit'
UNION ALL SELECT id, 2, 'Student lodging deposit', 1, 375.00, 375.00 FROM invoices WHERE club_id = :robotics_club_id AND title = 'Team Travel Deposit'
UNION ALL SELECT id, 1, 'PLA filament rolls', 5, 29.95, 149.75 FROM invoices WHERE club_id = :robotics_club_id AND title = '3D Printer Filament Restock'
UNION ALL SELECT id, 2, 'Expedited delivery', 1, 37.00, 37.00 FROM invoices WHERE club_id = :robotics_club_id AND title = '3D Printer Filament Restock'
UNION ALL SELECT id, 1, 'Electronics component bundle', 1, 94.50, 94.50 FROM invoices WHERE club_id = :robotics_club_id AND title = 'Duplicate Electronics Order'
UNION ALL SELECT id, 1, 'Foam display boards', 6, 18.40, 110.40 FROM invoices WHERE club_id = :arts_club_id AND title = 'Gallery Display Materials'
UNION ALL SELECT id, 2, 'Reusable gallery lighting clips', 1, 58.00, 58.00 FROM invoices WHERE club_id = :arts_club_id AND title = 'Gallery Display Materials'
UNION ALL SELECT id, 1, 'Performance costumes', 10, 52.00, 520.00 FROM invoices WHERE club_id = :arts_club_id AND title = 'Spring Production Costumes'
UNION ALL SELECT id, 2, 'Costume alterations', 1, 100.00, 100.00 FROM invoices WHERE club_id = :arts_club_id AND title = 'Spring Production Costumes'
UNION ALL SELECT id, 1, 'Stoneware clay boxes', 8, 24.65, 197.20 FROM invoices WHERE club_id = :arts_club_id AND title = 'Ceramics Studio Supplies'
UNION ALL SELECT id, 2, 'Classroom glaze set', 1, 150.00, 150.00 FROM invoices WHERE club_id = :arts_club_id AND title = 'Ceramics Studio Supplies';

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, note, performed_at)
SELECT id, 'CREATED', created_by, NULL, 'DRAFT', 'Invoice created.', created_at
FROM invoices WHERE club_id IN (:robotics_club_id, :arts_club_id);

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, note, performed_at)
SELECT id, 'SUBMITTED', created_by, 'DRAFT', 'SUBMITTED', 'Submitted with supporting receipt details.', submitted_at
FROM invoices WHERE club_id IN (:robotics_club_id, :arts_club_id) AND submitted_at IS NOT NULL;

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, note, performed_at)
SELECT id, 'APPROVED', approved_by, 'SUBMITTED', 'APPROVED', 'Approved for payment.', approved_at
FROM invoices WHERE club_id IN (:robotics_club_id, :arts_club_id) AND approved_at IS NOT NULL;

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, note, performed_at)
SELECT id, 'MARKED_PAID', paid_by, 'APPROVED', 'PAID', 'Payment recorded and invoice closed.', paid_at
FROM invoices WHERE club_id IN (:robotics_club_id, :arts_club_id) AND paid_at IS NOT NULL;

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, note, performed_at)
SELECT id, 'CANCELLED', cancelled_by, 'SUBMITTED', 'CANCELLED', cancellation_reason, cancelled_at
FROM invoices WHERE club_id IN (:robotics_club_id, :arts_club_id) AND cancelled_at IS NOT NULL;

-- Inventory includes available, checked-out, overdue, and completed-history examples.
INSERT INTO inventory_items (club_id, created_by, name, description, category, serial_number, status, created_at, updated_at)
VALUES
    (:robotics_club_id, :robotics_admin_id, 'Competition Robot · Atlas', 'Primary competition robot with mecanum drive and modular control board.', 'Robotics', 'CRA-ROB-001', 'CHECKED_IN', CURRENT_TIMESTAMP - INTERVAL '75 days', CURRENT_TIMESTAMP),
    (:robotics_club_id, :robotics_admin_id, 'DSLR Camera Kit', 'Camera, two lenses, batteries, and padded travel case.', 'Media', 'CRA-CAM-014', 'CHECKED_OUT', CURRENT_TIMESTAMP - INTERVAL '68 days', CURRENT_TIMESTAMP),
    (:robotics_club_id, :robotics_admin_id, 'Arduino Workshop Kit', 'Classroom kit with boards, breadboards, sensors, and jumper wires.', 'Electronics', 'CRA-ELC-027', 'CHECKED_OUT', CURRENT_TIMESTAMP - INTERVAL '62 days', CURRENT_TIMESTAMP),
    (:robotics_club_id, :robotics_admin_id, 'CAD Design Laptop', 'Portable workstation configured for student CAD and slicing tools.', 'Computers', 'CRA-LAP-009', 'CHECKED_IN', CURRENT_TIMESTAMP - INTERVAL '57 days', CURRENT_TIMESTAMP),
    (:arts_club_id, :arts_admin_id, 'Portable PA System', 'Battery-powered speaker, wireless microphone, and stand.', 'Audio', 'CRA-AUD-005', 'CHECKED_IN', CURRENT_TIMESTAMP - INTERVAL '70 days', CURRENT_TIMESTAMP),
    (:arts_club_id, :arts_admin_id, 'Tabletop Pottery Wheel', 'Compact pottery wheel with splash pan and tool set.', 'Ceramics', 'CRA-CER-012', 'CHECKED_OUT', CURRENT_TIMESTAMP - INTERVAL '64 days', CURRENT_TIMESTAMP),
    (:arts_club_id, :arts_admin_id, 'Gallery Display Easels', 'Set of six adjustable wood display easels.', 'Exhibition', 'CRA-ART-021', 'CHECKED_IN', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP),
    (:arts_club_id, :arts_admin_id, 'Heavy-Duty Sewing Machine', 'Club sewing machine with pedal, cover, and accessory kit.', 'Textiles', 'CRA-TEX-008', 'CHECKED_OUT', CURRENT_TIMESTAMP - INTERVAL '52 days', CURRENT_TIMESTAMP);

INSERT INTO inventory_checkouts (
    item_id, checked_out_by, checked_out_at, due_date, checkout_notes,
    checked_in_by, checked_in_at, checkin_notes
)
SELECT id, :member_id, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_DATE + 7,
       'Documenting the club showcase prototypes.', NULL::BIGINT, NULL::TIMESTAMP, NULL::TEXT
FROM inventory_items WHERE club_id = :robotics_club_id AND name = 'DSLR Camera Kit'
UNION ALL
SELECT id, :member_id, CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_DATE - 4,
       'Weekend sensor workshop kit.', NULL::BIGINT, NULL::TIMESTAMP, NULL::TEXT
FROM inventory_items WHERE club_id = :robotics_club_id AND name = 'Arduino Workshop Kit'
UNION ALL
SELECT id, :robotics_admin_id, CURRENT_TIMESTAMP - INTERVAL '28 days', CURRENT_DATE - 20,
       'CAD preparation for chassis revision.', :robotics_admin_id, CURRENT_TIMESTAMP - INTERVAL '19 days', 'Returned in excellent condition.'
FROM inventory_items WHERE club_id = :robotics_club_id AND name = 'CAD Design Laptop'
UNION ALL
SELECT id, :arts_admin_id, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_DATE + 10,
       'Preparing pieces for the student ceramics display.', NULL::BIGINT, NULL::TIMESTAMP, NULL::TEXT
FROM inventory_items WHERE club_id = :arts_club_id AND name = 'Tabletop Pottery Wheel'
UNION ALL
SELECT id, :member_id, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_DATE - 6,
       'Costume alterations for the spring showcase.', NULL::BIGINT, NULL::TIMESTAMP, NULL::TEXT
FROM inventory_items WHERE club_id = :arts_club_id AND name = 'Heavy-Duty Sewing Machine'
UNION ALL
SELECT id, :arts_admin_id, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_DATE - 22,
       'Outdoor student performance rehearsal.', :arts_admin_id, CURRENT_TIMESTAMP - INTERVAL '21 days', 'Microphone and speaker returned together.'
FROM inventory_items WHERE club_id = :arts_club_id AND name = 'Portable PA System';

-- Notifications give each role a useful, populated home/admin experience.
INSERT INTO notifications (user_id, type, reference_id, message, is_read, created_at)
VALUES
    (:school_admin_id, 'SCHOOL_MEMBERSHIP_REQUESTED', :school_id::TEXT, 'Chloe Kim requested to join Cypress Ridge Academy.', FALSE, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (:robotics_admin_id, 'CLUB_MEMBERSHIP_REQUESTED', :robotics_club_id::TEXT, 'Noah Singh requested to join Robotics & Innovation Club.', FALSE, CURRENT_TIMESTAMP - INTERVAL '8 hours'),
    (:member_id, 'INVOICE_SUBMITTED', (SELECT id::TEXT FROM invoices WHERE club_id = :arts_club_id AND title = 'Spring Production Costumes'), 'Your costume invoice was submitted for review.', TRUE, CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (:member_id, 'INVOICE_PAID', (SELECT id::TEXT FROM invoices WHERE club_id = :robotics_club_id AND title = '3D Printer Filament Restock'), 'Your filament reimbursement has been marked paid.', FALSE, CURRENT_TIMESTAMP - INTERVAL '10 days'),
    (:robotics_admin_id, 'INVOICE_SUBMITTED', (SELECT id::TEXT FROM invoices WHERE club_id = :robotics_club_id AND title = 'Regional Tournament Registration'), 'A new tournament invoice is ready for review.', FALSE, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (:arts_admin_id, 'INVOICE_SUBMITTED', (SELECT id::TEXT FROM invoices WHERE club_id = :arts_club_id AND title = 'Spring Production Costumes'), 'A new costume invoice is ready for review.', FALSE, CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (:robotics_admin_id, 'INVENTORY_CHECKED_IN', (SELECT id::TEXT FROM inventory_items WHERE club_id = :robotics_club_id AND name = 'CAD Design Laptop'), 'CAD Design Laptop was checked in successfully.', TRUE, CURRENT_TIMESTAMP - INTERVAL '19 days'),
    (:arts_admin_id, 'INVENTORY_CHECKED_IN', (SELECT id::TEXT FROM inventory_items WHERE club_id = :arts_club_id AND name = 'Portable PA System'), 'Portable PA System was checked in successfully.', TRUE, CURRENT_TIMESTAMP - INTERVAL '21 days'),
    (:robotics_admin_id, 'SCHOOL_MEMBERSHIP_APPROVED', :school_id::TEXT, 'Your Cypress Ridge Academy membership was approved.', TRUE, CURRENT_TIMESTAMP - INTERVAL '89 days'),
    (:arts_admin_id, 'CLUB_ADMIN_ASSIGNED', :arts_club_id::TEXT, 'You are now an administrator of Creative Arts Society.', TRUE, CURRENT_TIMESTAMP - INTERVAL '80 days');

-- A small, neutral moderation queue makes APP_ADMIN screenshots meaningful.
INSERT INTO content_reports (
    reporter_id, content_type, content_id, content_author_id, reason, details,
    content_snapshot, status, resolution, reviewed_by, reviewed_at, created_at
)
VALUES
    (:member_id, 'ANNOUNCEMENT',
     (SELECT id FROM announcements WHERE school_id = :school_id AND title = 'Campus reminder: bring your reusable bottle'),
     :school_admin_id, 'OTHER', 'Submitted while verifying the reporting workflow.',
     'Campus reminder: bring your reusable bottle', 'OPEN', NULL, NULL, NULL,
     CURRENT_TIMESTAMP - INTERVAL '5 hours'),
    (:arts_admin_id, 'EVENT',
     (SELECT id FROM events WHERE school_id = :school_id AND title = 'Robotics Open Lab'),
     :robotics_admin_id, 'PERSONAL_INFORMATION', 'Reviewing whether the room detail is appropriate for the public event card.',
     'Robotics Open Lab · Innovation Lab · Room 214', 'UNDER_REVIEW', NULL, :app_admin_id,
     CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '9 hours'),
    (:robotics_admin_id, 'CLUB', :arts_club_id, :school_admin_id, 'SPAM',
     'A duplicate club description briefly appeared during setup.',
     'Creative Arts Society', 'RESOLVED', 'Reviewed; the duplicate text was removed and no further action was needed.',
     :app_admin_id, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '3 days');

-- Abort the transaction if the fixture is incomplete or the password hashes
-- cannot authenticate every reserved demo account. A failed CHECK rolls back
-- the entire refresh because ON_ERROR_STOP is enabled by the wrapper.
CREATE TEMP TABLE demo_seed_assertion (
    passed BOOLEAN NOT NULL CHECK (passed)
) ON COMMIT DROP;

INSERT INTO demo_seed_assertion (passed)
SELECT
    (SELECT COUNT(*) FROM users
      WHERE email IN (
          'app.admin@cypressridge.test',
          'school.admin@cypressridge.test',
          'robotics.admin@cypressridge.test',
          'arts.admin@cypressridge.test',
          'member@cypressridge.test',
          'pending@cypressridge.test',
          'club.pending@cypressridge.test',
          'school.rejected@cypressridge.test',
          'club.rejected@cypressridge.test',
          'deletion@cypressridge.test'
      )) = 10
AND (SELECT COUNT(*) FROM users
      WHERE email IN (
          'app.admin@cypressridge.test',
          'school.admin@cypressridge.test',
          'robotics.admin@cypressridge.test',
          'arts.admin@cypressridge.test',
          'member@cypressridge.test',
          'pending@cypressridge.test',
          'club.pending@cypressridge.test',
          'school.rejected@cypressridge.test',
          'club.rejected@cypressridge.test',
          'deletion@cypressridge.test'
      ) AND password = crypt(:'demo_password', password)) = 10
AND (SELECT COUNT(*) FROM users
     WHERE id IN (
         :app_admin_id, :school_admin_id, :robotics_admin_id, :arts_admin_id,
         :member_id, :pending_id, :club_pending_id, :school_rejected_id,
         :club_rejected_id, :deletion_id
     )
       AND email_verified = TRUE
       AND enabled = TRUE
       AND suspended_at IS NULL
       AND age_confirmed = TRUE
       AND terms_accepted_at IS NOT NULL) = 10
AND (SELECT COUNT(*) FROM users
     WHERE email = 'app.admin@cypressridge.test' AND app_role = 'APP_ADMIN') = 1
AND (SELECT COUNT(*) FROM users
     WHERE id IN (
         :school_admin_id, :robotics_admin_id, :arts_admin_id, :member_id,
         :pending_id, :club_pending_id, :school_rejected_id,
         :club_rejected_id, :deletion_id
     ) AND app_role = 'APP_USER') = 9
AND (SELECT COUNT(*) FROM school_memberships WHERE school_id = :school_id) = 9
AND (SELECT COUNT(*) FROM school_memberships
     WHERE school_id = :school_id AND status = 'PENDING') = 1
AND (SELECT COUNT(*) FROM school_memberships
     WHERE school_id = :school_id AND status = 'REJECTED') = 1
AND (SELECT COUNT(*) FROM school_memberships
     WHERE school_id = :school_id AND user_id = :pending_id AND status = 'PENDING') = 1
AND (SELECT COUNT(*) FROM school_memberships
     WHERE school_id = :school_id AND user_id = :school_rejected_id AND status = 'REJECTED') = 1
AND (SELECT COUNT(*) FROM clubs WHERE school_id = :school_id) = 2
AND (SELECT COUNT(*) FROM schools WHERE id = :school_id AND tier = 'PREMIUM') = 1
AND (SELECT COUNT(*) FROM club_memberships WHERE club_id IN (:robotics_club_id, :arts_club_id)) = 9
AND (SELECT COUNT(*) FROM club_memberships
     WHERE club_id IN (:robotics_club_id, :arts_club_id) AND status = 'PENDING') = 1
AND (SELECT COUNT(*) FROM club_memberships
     WHERE club_id IN (:robotics_club_id, :arts_club_id) AND status = 'REJECTED') = 1
AND (SELECT COUNT(*) FROM club_memberships
     WHERE club_id = :robotics_club_id AND user_id = :club_pending_id AND status = 'PENDING') = 1
AND (SELECT COUNT(*) FROM club_memberships
     WHERE club_id = :robotics_club_id AND user_id = :club_rejected_id AND status = 'REJECTED') = 1
AND (SELECT COUNT(*) FROM announcements WHERE school_id = :school_id) = 6
AND (SELECT COUNT(*) FROM events WHERE school_id = :school_id) = 6
AND (SELECT COUNT(DISTINCT response) FROM event_rsvps
     WHERE event_id IN (SELECT id FROM events WHERE school_id = :school_id)) = 3
AND (SELECT COUNT(*) FROM invoices WHERE club_id IN (:robotics_club_id, :arts_club_id)) = 8
AND (SELECT COUNT(DISTINCT status) FROM invoices
     WHERE club_id IN (:robotics_club_id, :arts_club_id)) = 5
AND (SELECT COUNT(*) FROM inventory_items WHERE club_id IN (:robotics_club_id, :arts_club_id)) = 8
AND (SELECT COUNT(*) FROM inventory_checkouts
     WHERE checked_out_by = :member_id AND checked_in_at IS NULL) >= 1
AND (SELECT COUNT(*) FROM notifications
     WHERE user_id IN (
         :app_admin_id, :school_admin_id, :robotics_admin_id, :arts_admin_id,
         :member_id, :pending_id, :club_pending_id, :school_rejected_id,
         :club_rejected_id, :deletion_id
     )) = 10
AND (SELECT COUNT(*) FROM content_reports
     WHERE reporter_id IN (:robotics_admin_id, :arts_admin_id, :member_id)) = 3
AND (SELECT COUNT(DISTINCT status) FROM content_reports
     WHERE reporter_id IN (:robotics_admin_id, :arts_admin_id, :member_id)) = 3
AND (SELECT COUNT(*) FROM school_memberships WHERE user_id = :deletion_id) = 0
AND (SELECT COUNT(*) FROM club_memberships WHERE user_id = :deletion_id) = 0
AND (SELECT COUNT(*) FROM inventory_checkouts
     WHERE checked_out_by = :deletion_id AND checked_in_at IS NULL) = 0
AND (SELECT COUNT(*) FROM invoices WHERE created_by = :deletion_id) = 0
AND (SELECT COUNT(*) FROM content_reports WHERE reporter_id = :deletion_id) = 0
AND (SELECT COUNT(*) FROM notifications WHERE user_id = :deletion_id) = 0;

COMMIT;

\echo 'Verified: 10 users, 1 school, 9 school memberships, 2 clubs, 9 club memberships'
\echo 'Verified: 6 announcements, 6 events, 8 invoices, 8 inventory items'
\echo 'Verified: 10 notifications, 3 moderation reports, all passwords hashed'
