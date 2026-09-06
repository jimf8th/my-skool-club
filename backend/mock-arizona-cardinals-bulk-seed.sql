-- Bulk seed: 50 additional members + 500 additional invoices for the
-- Arizona Cardinals Club (club_id = 2, parent school_id = 2 "ACP High School 2").
--
-- Reuses an existing dummy bcrypt hash for all new accounts (dev/test data only).
-- School admin reviewer: Robin Bickus (user_id 5). Club admin/approver: Kyler Murray (user_id 7).

BEGIN;

CREATE TEMP TABLE tmp_new_users (id bigint, first_name text, last_name text) ON COMMIT DROP;

WITH ins AS (
  INSERT INTO users (email, password, first_name, last_name, app_role, email_verified, enabled, created_at)
  VALUES
    ('ethan.whitfield@dummy.com',  '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Ethan',    'Whitfield',   'APP_USER', true, true, now()),
    ('mason.sanders@dummy.com',    '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Mason',    'Sanders',     'APP_USER', true, true, now()),
    ('logan.brooks@dummy.com',     '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Logan',    'Brooks',      'APP_USER', true, true, now()),
    ('lucas.callahan@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Lucas',    'Callahan',    'APP_USER', true, true, now()),
    ('jackson.reyes@dummy.com',    '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Jackson',  'Reyes',       'APP_USER', true, true, now()),
    ('aiden.bishop@dummy.com',     '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Aiden',    'Bishop',      'APP_USER', true, true, now()),
    ('caden.dalton@dummy.com',     '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Caden',    'Dalton',      'APP_USER', true, true, now()),
    ('grayson.marsh@dummy.com',    '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Grayson',  'Marsh',       'APP_USER', true, true, now()),
    ('carter.hensley@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Carter',   'Hensley',     'APP_USER', true, true, now()),
    ('wyatt.whitaker@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Wyatt',    'Whitaker',    'APP_USER', true, true, now()),
    ('julian.sullivan@dummy.com',  '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Julian',   'Sullivan',    'APP_USER', true, true, now()),
    ('levi.reeves@dummy.com',      '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Levi',     'Reeves',      'APP_USER', true, true, now()),
    ('owen.trent@dummy.com',       '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Owen',     'Trent',       'APP_USER', true, true, now()),
    ('gabriel.vaughn@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Gabriel',  'Vaughn',      'APP_USER', true, true, now()),
    ('isaac.alden@dummy.com',      '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Isaac',    'Alden',       'APP_USER', true, true, now()),
    ('nathan.barlow@dummy.com',    '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Nathan',   'Barlow',      'APP_USER', true, true, now()),
    ('ryder.chastain@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Ryder',    'Chastain',    'APP_USER', true, true, now()),
    ('colton.duval@dummy.com',     '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Colton',   'Duval',       'APP_USER', true, true, now()),
    ('bryson.everson@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Bryson',   'Everson',     'APP_USER', true, true, now()),
    ('easton.faulkner@dummy.com',  '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Easton',   'Faulkner',    'APP_USER', true, true, now()),
    ('kai.gantry@dummy.com',       '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Kai',      'Gantry',      'APP_USER', true, true, now()),
    ('landon.halstead@dummy.com',  '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Landon',   'Halstead',    'APP_USER', true, true, now()),
    ('jaxon.ingram@dummy.com',     '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Jaxon',    'Ingram',      'APP_USER', true, true, now()),
    ('brody.jacoby@dummy.com',     '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Brody',    'Jacoby',      'APP_USER', true, true, now()),
    ('silas.kensington@dummy.com', '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Silas',    'Kensington',  'APP_USER', true, true, now()),
    ('micah.larkspur@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Micah',    'Larkspur',    'APP_USER', true, true, now()),
    ('weston.mercer@dummy.com',    '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Weston',   'Mercer',      'APP_USER', true, true, now()),
    ('maddox.nakamura@dummy.com',  '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Maddox',   'Nakamura',    'APP_USER', true, true, now()),
    ('beckett.osgood@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Beckett',  'Osgood',      'APP_USER', true, true, now()),
    ('bennett.pruitt@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Bennett',  'Pruitt',      'APP_USER', true, true, now()),
    ('emmett.quintero@dummy.com',  '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Emmett',   'Quintero',    'APP_USER', true, true, now()),
    ('tucker.radcliffe@dummy.com', '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Tucker',   'Radcliffe',   'APP_USER', true, true, now()),
    ('cole.stanton@dummy.com',     '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Cole',     'Stanton',     'APP_USER', true, true, now()),
    ('chase.tremaine@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Chase',    'Tremaine',    'APP_USER', true, true, now()),
    ('garrett.underhill@dummy.com','$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Garrett',  'Underhill',   'APP_USER', true, true, now()),
    ('dawson.vance@dummy.com',     '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Dawson',   'Vance',       'APP_USER', true, true, now()),
    ('holden.wexford@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Holden',   'Wexford',     'APP_USER', true, true, now()),
    ('cooper.yardley@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Cooper',   'Yardley',     'APP_USER', true, true, now()),
    ('grant.ashworth@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Grant',    'Ashworth',    'APP_USER', true, true, now()),
    ('jace.blackwood@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Jace',     'Blackwood',   'APP_USER', true, true, now()),
    ('kingston.crenshaw@dummy.com','$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Kingston', 'Crenshaw',    'APP_USER', true, true, now()),
    ('miles.donovan@dummy.com',    '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Miles',    'Donovan',     'APP_USER', true, true, now()),
    ('nolan.ellison@dummy.com',    '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Nolan',    'Ellison',     'APP_USER', true, true, now()),
    ('preston.fenwick@dummy.com',  '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Preston',  'Fenwick',     'APP_USER', true, true, now()),
    ('rhett.gables@dummy.com',     '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Rhett',    'Gables',      'APP_USER', true, true, now()),
    ('sawyer.holloway@dummy.com',  '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Sawyer',   'Holloway',    'APP_USER', true, true, now()),
    ('tanner.ivers@dummy.com',     '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Tanner',   'Ivers',       'APP_USER', true, true, now()),
    ('zane.jennings@dummy.com',    '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Zane',     'Jennings',    'APP_USER', true, true, now()),
    ('axel.kirkland@dummy.com',    '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Axel',     'Kirkland',    'APP_USER', true, true, now()),
    ('bryce.lockwood@dummy.com',   '$2a$10$8zMbT4yLy.H.YJFv3kuaJOBbQLZKdakTF/3ahszOGlXiUtJpy1ZoC', 'Bryce',    'Lockwood',    'APP_USER', true, true, now())
  RETURNING id, first_name, last_name
)
INSERT INTO tmp_new_users SELECT * FROM ins;

-- Approved school membership (required precondition for club membership)
INSERT INTO school_memberships (user_id, school_id, role, status, requested_at, reviewed_at, reviewed_by)
SELECT id, 2, 'MEMBER', 'APPROVED', now() - interval '30 days', now() - interval '29 days', 5
FROM tmp_new_users;

-- Approved club membership in the Arizona Cardinals Club
INSERT INTO club_memberships (user_id, club_id, role, status, requested_at, reviewed_at, reviewed_by)
SELECT id, 2, 'MEMBER', 'APPROVED', now() - interval '28 days', now() - interval '27 days', 7
FROM tmp_new_users;

-- ── 500 invoices, round-robin created by the 50 new members ──────────────────
CREATE TEMP TABLE tmp_new_invoices (
  id bigint, created_by bigint, status text, total_amount numeric(12,2), created_at timestamp,
  submitted_at timestamp, approved_at timestamp, approved_by bigint,
  paid_at timestamp, paid_by bigint,
  cancelled_at timestamp, cancelled_by bigint, cancellation_reason text
) ON COMMIT DROP;

WITH member_idx AS (
  SELECT id, row_number() OVER (ORDER BY id) - 1 AS idx FROM tmp_new_users
),
gen AS (
  SELECT
    n,
    m.id AS creator_id,
    (ARRAY['DRAFT','SUBMITTED','APPROVED','PAID','CANCELLED'])[(n % 5) + 1] AS status,
    (ARRAY['Team Equipment Restock','Travel Reimbursement','Referee Fees','Banquet Catering','Uniform Order',
           'Field Rental','Printing Services','Practice Supplies','Transportation Costs','Award Trophies',
           'Photography Package','First Aid Supplies','Team Meals','Locker Room Supplies','Scoreboard Repair',
           'Water & Ice Delivery','Video Recording Equipment','Team Banners','Volunteer Appreciation','Season Kickoff Event']
    )[(n % 20) + 1] AS title,
    (200 + (n % 40) * 20)::numeric(12,2) AS total_amount,
    now() - ((500 - n) * interval '5 hours') AS created_at
  FROM generate_series(1, 500) AS n
  JOIN member_idx m ON m.idx = (n - 1) % 50
),
gen2 AS (
  SELECT
    n, creator_id, status, title, total_amount, created_at,
    CASE WHEN status IN ('SUBMITTED','APPROVED','PAID','CANCELLED') THEN created_at + interval '1 day' END AS submitted_at,
    CASE WHEN status IN ('APPROVED','PAID') THEN created_at + interval '2 day' END AS approved_at,
    CASE WHEN status IN ('APPROVED','PAID') THEN 7::bigint END AS approved_by,
    CASE WHEN status = 'PAID' THEN created_at + interval '4 day' END AS paid_at,
    CASE WHEN status = 'PAID' THEN 7::bigint END AS paid_by,
    CASE WHEN status = 'CANCELLED' THEN created_at + interval '2 day' END AS cancelled_at,
    CASE WHEN status = 'CANCELLED' THEN creator_id END AS cancelled_by,
    CASE WHEN status = 'CANCELLED' THEN 'Vendor unavailable / order no longer needed.' END AS cancellation_reason
  FROM gen
),
ins AS (
  INSERT INTO invoices (club_id, created_by, title, payment_required, total_amount, status,
                         submitted_at, approved_at, approved_by, paid_at, paid_by,
                         cancelled_at, cancelled_by, cancellation_reason, created_at, updated_at)
  SELECT 2, creator_id, title, true, total_amount, status,
         submitted_at, approved_at, approved_by, paid_at, paid_by,
         cancelled_at, cancelled_by, cancellation_reason, created_at, created_at
  FROM gen2
  RETURNING id, created_by, status, total_amount, created_at,
            submitted_at, approved_at, approved_by, paid_at, paid_by,
            cancelled_at, cancelled_by, cancellation_reason
)
INSERT INTO tmp_new_invoices SELECT * FROM ins;

-- Two line items per invoice, summing exactly to total_amount (total_amount is always a multiple of 20)
INSERT INTO invoice_line_items (invoice_id, line_order, description, quantity, unit_price, total_price)
SELECT id, 1, 'Primary cost', 1, total_amount / 2, total_amount / 2 FROM tmp_new_invoices
UNION ALL
SELECT id, 2, 'Additional fees', 1, total_amount / 2, total_amount / 2 FROM tmp_new_invoices;

-- Audit trail matching each invoice's lifecycle
INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, performed_at)
SELECT id, 'CREATED', created_by, NULL, 'DRAFT', created_at FROM tmp_new_invoices;

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, performed_at)
SELECT id, 'SUBMITTED', created_by, 'DRAFT', 'SUBMITTED', submitted_at FROM tmp_new_invoices WHERE submitted_at IS NOT NULL;

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, performed_at)
SELECT id, 'APPROVED', approved_by, 'SUBMITTED', 'APPROVED', approved_at FROM tmp_new_invoices WHERE approved_at IS NOT NULL;

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, performed_at)
SELECT id, 'MARKED_PAID', paid_by, 'APPROVED', 'PAID', paid_at FROM tmp_new_invoices WHERE paid_at IS NOT NULL;

INSERT INTO invoice_audit_logs (invoice_id, action, performed_by, previous_status, new_status, note, performed_at)
SELECT id, 'CANCELLED', cancelled_by, 'SUBMITTED', 'CANCELLED', cancellation_reason, cancelled_at FROM tmp_new_invoices WHERE cancelled_at IS NOT NULL;

COMMIT;
