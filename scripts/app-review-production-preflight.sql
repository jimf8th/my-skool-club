\set ON_ERROR_STOP on

-- Read-only production guard. Stop before the fixture transaction if the
-- reserved school is connected to an account outside the review domain.
SELECT
    to_regclass('public.users') IS NOT NULL
    AND to_regclass('public.schools') IS NOT NULL
    AND to_regclass('public.clubs') IS NOT NULL
    AND to_regclass('public.school_memberships') IS NOT NULL
    AND to_regclass('public.club_memberships') IS NOT NULL
    AND to_regclass('public.announcements') IS NOT NULL
    AND to_regclass('public.events') IS NOT NULL
    AND to_regclass('public.invoices') IS NOT NULL
    AND to_regclass('public.inventory_items') IS NOT NULL
    AND to_regclass('public.content_reports') IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'schools'
          AND column_name = 'tier'
    )
    AS schema_ready
\gset

\if :schema_ready
\else
\echo 'Safety stop: production schema is missing a required table or the schools.tier column.'
\quit 4
\endif

WITH
target_school AS (
    SELECT id, created_by FROM schools WHERE name = 'Cypress Ridge Academy'
),
target_clubs AS (
    SELECT id, created_by FROM clubs
    WHERE school_id IN (SELECT id FROM target_school)
),
target_events AS (
    SELECT id, created_by FROM events
    WHERE school_id IN (SELECT id FROM target_school)
),
target_announcements AS (
    SELECT id, created_by FROM announcements
    WHERE school_id IN (SELECT id FROM target_school)
),
target_invoices AS (
    SELECT id, created_by, approved_by, paid_by, cancelled_by FROM invoices
    WHERE club_id IN (SELECT id FROM target_clubs)
),
target_items AS (
    SELECT id, created_by FROM inventory_items
    WHERE club_id IN (SELECT id FROM target_clubs)
),
target_reports AS (
    SELECT reporter_id, content_author_id, reviewed_by FROM content_reports
    WHERE (content_type = 'SCHOOL' AND content_id IN (SELECT id FROM target_school))
       OR (content_type = 'CLUB' AND content_id IN (SELECT id FROM target_clubs))
       OR (content_type = 'EVENT' AND content_id IN (SELECT id FROM target_events))
       OR (content_type = 'ANNOUNCEMENT' AND content_id IN (SELECT id FROM target_announcements))
),
associated_users(user_id) AS (
    SELECT created_by FROM target_school
    UNION SELECT created_by FROM target_clubs
    UNION SELECT user_id FROM school_memberships
        WHERE school_id IN (SELECT id FROM target_school)
    UNION SELECT reviewed_by FROM school_memberships
        WHERE school_id IN (SELECT id FROM target_school)
    UNION SELECT user_id FROM club_memberships
        WHERE club_id IN (SELECT id FROM target_clubs)
    UNION SELECT reviewed_by FROM club_memberships
        WHERE club_id IN (SELECT id FROM target_clubs)
    UNION SELECT created_by FROM target_events
    UNION SELECT user_id FROM event_rsvps
        WHERE event_id IN (SELECT id FROM target_events)
    UNION SELECT created_by FROM target_announcements
    UNION SELECT created_by FROM target_invoices
    UNION SELECT approved_by FROM target_invoices
    UNION SELECT paid_by FROM target_invoices
    UNION SELECT cancelled_by FROM target_invoices
    UNION SELECT performed_by FROM invoice_audit_logs
        WHERE invoice_id IN (SELECT id FROM target_invoices)
    UNION SELECT created_by FROM target_items
    UNION SELECT checked_out_by FROM inventory_checkouts
        WHERE item_id IN (SELECT id FROM target_items)
    UNION SELECT checked_in_by FROM inventory_checkouts
        WHERE item_id IN (SELECT id FROM target_items)
    UNION SELECT reporter_id FROM target_reports
    UNION SELECT content_author_id FROM target_reports
    UNION SELECT reviewed_by FROM target_reports
),
foreign_users AS (
    SELECT DISTINCT users.email
    FROM associated_users
    JOIN users ON users.id = associated_users.user_id
    WHERE lower(users.email) NOT LIKE '%@cypressridge.test'
      AND lower(users.email) <> 'deleted-user@myskoolclub.invalid'
)
SELECT
    COUNT(*) > 0 AS has_foreign_users,
    COALESCE(string_agg(email, ', ' ORDER BY email), '(none)') AS foreign_user_emails
FROM foreign_users
\gset

\if :has_foreign_users
\echo 'Safety stop: Cypress Ridge Academy is associated with non-review users:'
\echo :foreign_user_emails
\quit 5
\endif

\echo 'Preflight passed: Cypress Ridge Academy has no non-review user associations.'
