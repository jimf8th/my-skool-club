#!/usr/bin/env bash
# Wipes ALL production users (Firebase + Cloud SQL) and re-creates the ten
# Cypress Ridge App Review accounts linked to Firebase Authentication.
#
# The shared password is read without echo and used only to create Firebase
# accounts. It is never written to disk, included in a SQL argument, or stored
# in any job definition.  The Cloud Run Job and the temporary Secret Manager
# value used for the password are both deleted on exit.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_FILE="${SCRIPT_DIR}/seed-mobile-demo.sql"
PREFLIGHT_FILE="${SCRIPT_DIR}/app-review-production-preflight.sql"
FIREBASE_PROJECT="my-skool-club-web"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { printf "%b[firebase-reset]%b %s\n" "$CYAN"   "$NC" "$*"; }
ok()   { printf "%b[firebase-reset]%b %s\n" "$GREEN"  "$NC" "$*"; }
warn() { printf "%b[firebase-reset]%b %s\n" "$YELLOW" "$NC" "$*"; }
fail() { printf "%b[firebase-reset]%b %s\n" "$RED"    "$NC" "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: ./scripts/reset-users-firebase.sh [--yes]

Wipes ALL users from Firebase Authentication and Cloud SQL, then creates
the ten Cypress Ridge App Review accounts linked to Firebase.

All other production data (schools, clubs, content, invoices, inventory)
is removed along with the users that own it.  This cannot be undone.

--yes  Skip the typed production confirmation phrase.
EOF
}

AUTO_CONFIRM=false
case "${1:-}" in
  '') ;;
  --yes) AUTO_CONFIRM=true ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 2 ;;
esac

# shellcheck source=scripts/config.sh
source "${SCRIPT_DIR}/config.sh"

for cmd in gcloud curl node gzip base64; do
  command -v "$cmd" >/dev/null 2>&1 || fail "${cmd} is required."
done
[[ -f "$SEED_FILE" ]]     || fail "Seed fixture not found: ${SEED_FILE}"
[[ -f "$PREFLIGHT_FILE" ]] || fail "Preflight not found: ${PREFLIGHT_FILE}"

GCLOUD_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n 1)"
[[ -n "$GCLOUD_ACCOUNT" ]] || fail "No active gcloud account. Run: gcloud auth login"
[[ -n "${GCP_PROJECT_ID:-}" ]] || fail "GCP project is not configured."

GCP_JOB_REGION="${GCP_REGION:-us-central1}"
SQL_INSTANCE="${CLOUD_SQL_INSTANCE_NAME:-my-skool-club-db}"
DATABASE_NAME="${DB_NAME:-myskoolclub}"
SERVICE_ACCOUNT="${SA_NAME:-my-skool-club-sa}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
VPC_NETWORK="${VPC_NETWORK_NAME:-my-skool-club-vpc}"
VPC_SUBNET="${VPC_SUBNET_NAME:-my-skool-club-run}"

INSTANCE_CONNECTION="$(gcloud sql instances describe "$SQL_INSTANCE" \
  --account="$GCLOUD_ACCOUNT" --project="$GCP_PROJECT_ID" \
  --format='value(connectionName)')" || fail "Cloud SQL validation failed."
INSTANCE_STATE="$(gcloud sql instances describe "$SQL_INSTANCE" \
  --account="$GCLOUD_ACCOUNT" --project="$GCP_PROJECT_ID" \
  --format='value(state)')"
[[ "$INSTANCE_STATE" == "RUNNABLE" ]] || fail "Cloud SQL state is ${INSTANCE_STATE}."

# ---- Prompt for the shared password ----
REVIEW_PASSWORD="${MSC_REVIEW_PASSWORD:-}"
if [[ -z "$REVIEW_PASSWORD" ]]; then
  [[ -t 0 ]] || fail "Set MSC_REVIEW_PASSWORD when running non-interactively."
  printf "  Shared password for all ten Firebase accounts: "
  IFS= read -r -s REVIEW_PASSWORD; printf "\n"
  printf "  Confirm shared password: "
  IFS= read -r -s REVIEW_PASSWORD_CONFIRM; printf "\n"
  [[ "$REVIEW_PASSWORD" == "$REVIEW_PASSWORD_CONFIRM" ]] || fail "Passwords did not match."
  unset REVIEW_PASSWORD_CONFIRM
fi
[[ "${#REVIEW_PASSWORD}" -ge 8 ]] || fail "Use a password with at least 8 characters."

printf "\n"
warn "PRODUCTION user wipe and Firebase re-seed"
printf "  GCP account      : %s\n" "$GCLOUD_ACCOUNT"
printf "  GCP project      : %s\n" "$GCP_PROJECT_ID"
printf "  Firebase project : %s\n" "$FIREBASE_PROJECT"
printf "  Cloud SQL        : %s\n" "$INSTANCE_CONNECTION"
printf "  Database         : %s\n" "$DATABASE_NAME"
printf "  Action           : DELETE all users (Firebase + SQL), create 10 review accounts\n\n"

if [[ "$AUTO_CONFIRM" != "true" ]]; then
  read -r -p "  Type WIPE ALL USERS IN PRODUCTION to continue: " confirmation
  [[ "$confirmation" == "WIPE ALL USERS IN PRODUCTION" ]] || \
    fail "Confirmation did not match; nothing changed."
fi

# ---- Firebase helpers ----
firebase_token() {
  gcloud auth print-access-token --account="$GCLOUD_ACCOUNT"
}

firebase_hdr() {
  local tok; tok="$(firebase_token)"
  printf '%s\n' \
    "-H" "Authorization: Bearer ${tok}" \
    "-H" "x-goog-user-project: ${FIREBASE_PROJECT}" \
    "-H" "Content-Type: application/json"
}

# ---- Wipe all Firebase users ----
log "Fetching existing Firebase users to delete..."
FIREBASE_TOKEN="$(firebase_token)"
ALL_UIDS="$(curl -fsS \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "x-goog-user-project: ${FIREBASE_PROJECT}" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"maxResults":500}' \
  "https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT}/accounts:query" \
  | node -e '
    let s=""; process.stdin.on("data",c=>s+=c);
    process.stdin.on("end",()=>{
      const r=JSON.parse(s);
      const users=(r.userInfo||[]);
      console.log(JSON.stringify(users.map(u=>u.localId)));
    });
  ')"

UID_COUNT="$(node -e "console.log(JSON.parse(process.argv[1]).length)" "$ALL_UIDS")"
if [[ "$UID_COUNT" -gt 0 ]]; then
  log "Deleting ${UID_COUNT} existing Firebase user(s)..."
  FIREBASE_TOKEN="$(firebase_token)"
  curl -fsS \
    -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
    -H "x-goog-user-project: ${FIREBASE_PROJECT}" \
    -H "Content-Type: application/json" \
    -X POST \
    "https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT}/accounts:batchDelete" \
    -d "{\"localIds\":${ALL_UIDS},\"force\":true}" | \
    node -e '
      let s=""; process.stdin.on("data",c=>s+=c);
      process.stdin.on("end",()=>{
        const r=JSON.parse(s);
        if(r.errors&&r.errors.length) { console.error("Batch delete errors:",JSON.stringify(r.errors)); process.exit(1); }
        console.log("Firebase users deleted.");
      });
    '
else
  log "No existing Firebase users found."
fi

# ---- Create 10 Firebase accounts and capture UIDs ----
log "Creating ten Cypress Ridge Firebase accounts..."

create_firebase_user() {
  local email="$1" display_name="$2"
  FIREBASE_TOKEN="$(firebase_token)"
  node -e "
    const https=require('https');
    const body=JSON.stringify({
      email:'${email}',
      password:process.argv[1],
      displayName:'${display_name}',
      emailVerified:true
    });
    const opts={
      hostname:'identitytoolkit.googleapis.com',
      path:'/v1/projects/${FIREBASE_PROJECT}/accounts',
      method:'POST',
      headers:{
        'Authorization':'Bearer $(firebase_token)',
        'x-goog-user-project':'${FIREBASE_PROJECT}',
        'Content-Type':'application/json',
        'Content-Length':body.length
      }
    };
    let res='';
    const req=https.request(opts,r=>{r.on('data',c=>res+=c);r.on('end',()=>{
      const j=JSON.parse(res);
      if(j.error){console.error(j.error.message);process.exit(1);}
      console.log(j.localId);
    })});
    req.on('error',e=>{console.error(e.message);process.exit(1);});
    req.write(body);
    req.end();
  " "$REVIEW_PASSWORD"
}

UID_APP_ADMIN="$(create_firebase_user    "app.admin@cypressridge.test"          "Avery Brooks")"
UID_SCHOOL_ADMIN="$(create_firebase_user "school.admin@cypressridge.test"       "Jordan Lee")"
UID_ROBOTICS="$(create_firebase_user     "robotics.admin@cypressridge.test"     "Maya Patel")"
UID_ARTS="$(create_firebase_user         "arts.admin@cypressridge.test"         "Sofia Martinez")"
UID_MEMBER="$(create_firebase_user       "member@cypressridge.test"             "Ethan Williams")"
UID_PENDING="$(create_firebase_user      "pending@cypressridge.test"            "Chloe Kim")"
UID_CLUB_PENDING="$(create_firebase_user "club.pending@cypressridge.test"       "Noah Singh")"
UID_SCH_REJECTED="$(create_firebase_user "school.rejected@cypressridge.test"   "Olivia Chen")"
UID_CLB_REJECTED="$(create_firebase_user "club.rejected@cypressridge.test"     "Liam Garcia")"
UID_DELETION="$(create_firebase_user     "deletion@cypressridge.test"           "Taylor Reed")"

for var_name in UID_APP_ADMIN UID_SCHOOL_ADMIN UID_ROBOTICS UID_ARTS UID_MEMBER \
                UID_PENDING UID_CLUB_PENDING UID_SCH_REJECTED UID_CLB_REJECTED UID_DELETION; do
  [[ -n "${!var_name:-}" ]] || fail "Failed to get Firebase UID for ${var_name}."
  log "  ${var_name}: ${!var_name}"
done
ok "All ten Firebase accounts created."

# ---- Build the Firebase-aware user INSERT SQL ----
# Replaces the password-based INSERT from seed-mobile-demo.sql with firebase_uid.
FIREBASE_USER_SQL="$(cat << ENDSQL
-- Wipe everything owned by users before removing the users themselves.
DELETE FROM notifications;
DELETE FROM friend_invitations;
DELETE FROM event_rsvps;
DELETE FROM inventory_checkouts;
DELETE FROM invoice_audit_logs;
DELETE FROM invoice_line_items;
DELETE FROM invoices;
DELETE FROM inventory_items;
DELETE FROM content_reports;
DELETE FROM announcements;
DELETE FROM events;
DELETE FROM club_memberships;
DELETE FROM school_memberships;
DELETE FROM clubs;
DELETE FROM schools;
DELETE FROM school_requests;
DELETE FROM users WHERE email != 'deleted-user@myskoolclub.invalid';

INSERT INTO users (
    email, firebase_uid, first_name, last_name, graduation_year, app_role,
    email_verified, enabled, age_confirmed, terms_accepted_at, terms_version,
    created_at, updated_at
)
VALUES
    ('app.admin@cypressridge.test', '${UID_APP_ADMIN}',
     'Avery', 'Brooks', NULL, 'APP_ADMIN', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '120 days', CURRENT_TIMESTAMP),
    ('school.admin@cypressridge.test', '${UID_SCHOOL_ADMIN}',
     'Jordan', 'Lee', NULL, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '110 days', CURRENT_TIMESTAMP),
    ('robotics.admin@cypressridge.test', '${UID_ROBOTICS}',
     'Maya', 'Patel', 2027, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '95 days', CURRENT_TIMESTAMP),
    ('arts.admin@cypressridge.test', '${UID_ARTS}',
     'Sofia', 'Martinez', 2028, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP),
    ('member@cypressridge.test', '${UID_MEMBER}',
     'Ethan', 'Williams', 2027, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '70 days', CURRENT_TIMESTAMP),
    ('pending@cypressridge.test', '${UID_PENDING}',
     'Chloe', 'Kim', 2029, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP),
    ('club.pending@cypressridge.test', '${UID_CLUB_PENDING}',
     'Noah', 'Singh', 2028, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP),
    ('school.rejected@cypressridge.test', '${UID_SCH_REJECTED}',
     'Olivia', 'Chen', 2029, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP),
    ('club.rejected@cypressridge.test', '${UID_CLB_REJECTED}',
     'Liam', 'Garcia', 2027, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP),
    ('deletion@cypressridge.test', '${UID_DELETION}',
     'Taylor', 'Reed', NULL, 'APP_USER', TRUE, TRUE, TRUE,
     CURRENT_TIMESTAMP, '2026-08-08', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP);
ENDSQL
)"

# ---- Build combined SQL: Firebase user INSERT + rest of fixture seed ----
# Strip the password-based user INSERT block from the original seed SQL and
# replace it with the Firebase-uid-based block generated above.
FIXTURE_SQL_TAIL="$(awk '
  /^SELECT id AS app_admin_id/ { found=1 }
  found { print }
' "$SEED_FILE")"

COMBINED_SQL="$(printf '%s\n\n%s' "\\set ON_ERROR_STOP on" "BEGIN;" "${FIREBASE_USER_SQL}")"$'\n\n'"${FIXTURE_SQL_TAIL}"

# ---- Provision a temporary Secret Manager secret and Cloud Run Job ----
RESOURCE_SUFFIX="$(date +%s)-$$"
TEMP_JOB_NAME="msc-firebase-reset-${RESOURCE_SUFFIX}"
TEMP_SQL_SECRET="msc-firebase-reset-sql-${RESOURCE_SUFFIX}"

cleanup() {
  local code=$?; trap - EXIT INT TERM
  if gcloud run jobs describe "$TEMP_JOB_NAME" \
      --account="$GCLOUD_ACCOUNT" --project="$GCP_PROJECT_ID" \
      --region="$GCP_JOB_REGION" >/dev/null 2>&1; then
    log "Deleting temporary Cloud Run Job..."
    gcloud run jobs delete "$TEMP_JOB_NAME" \
      --account="$GCLOUD_ACCOUNT" --project="$GCP_PROJECT_ID" \
      --region="$GCP_JOB_REGION" --quiet >/dev/null 2>&1 || true
  fi
  if gcloud secrets describe "$TEMP_SQL_SECRET" \
      --account="$GCLOUD_ACCOUNT" --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
    log "Deleting temporary SQL secret..."
    gcloud secrets delete "$TEMP_SQL_SECRET" \
      --account="$GCLOUD_ACCOUNT" --project="$GCP_PROJECT_ID" \
      --quiet >/dev/null 2>&1 || true
  fi
  unset REVIEW_PASSWORD MSC_REVIEW_PASSWORD COMBINED_SQL FIREBASE_USER_SQL
  exit "$code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

log "Storing SQL in a temporary Secret Manager secret..."
printf '%s' "$COMBINED_SQL" | gzip | base64 | tr -d '\n' | \
  gcloud secrets create "$TEMP_SQL_SECRET" \
    --account="$GCLOUD_ACCOUNT" --project="$GCP_PROJECT_ID" \
    --replication-policy=automatic --data-file=- --quiet >/dev/null

gcloud secrets add-iam-policy-binding "$TEMP_SQL_SECRET" \
  --account="$GCLOUD_ACCOUNT" --project="$GCP_PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role='roles/secretmanager.secretAccessor' --quiet >/dev/null

PREFLIGHT_PAYLOAD="$(gzip -c "$PREFLIGHT_FILE" | base64 | tr -d '\n')"

CLOUD_JOB_SCRIPT='printf "%s" "$PREFLIGHT_SQL_GZIP_B64" | base64 -d | gzip -d > /tmp/preflight.sql
printf "%s" "$RESET_SQL_GZIP_B64" | base64 -d | gzip -d > /tmp/reset.sql
psql -X -q -v ON_ERROR_STOP=1 -f /tmp/preflight.sql
psql -X -q -v ON_ERROR_STOP=1 -f /tmp/reset.sql'

log "Deploying and executing Cloud Run Job ${TEMP_JOB_NAME}..."
gcloud run jobs deploy "$TEMP_JOB_NAME" \
  --account="$GCLOUD_ACCOUNT" \
  --project="$GCP_PROJECT_ID" \
  --region="$GCP_JOB_REGION" \
  --image='docker.io/library/postgres:16-alpine' \
  --service-account="$SERVICE_ACCOUNT" \
  --set-cloudsql-instances="$INSTANCE_CONNECTION" \
  --network="$VPC_NETWORK" \
  --subnet="$VPC_SUBNET" \
  --vpc-egress=private-ranges-only \
  --set-env-vars="PGHOST=/cloudsql/${INSTANCE_CONNECTION},PGPORT=5432,PGDATABASE=${DATABASE_NAME},PGSSLMODE=disable,PREFLIGHT_SQL_GZIP_B64=${PREFLIGHT_PAYLOAD}" \
  --set-secrets="PGUSER=db-username:latest,PGPASSWORD=db-password:latest,RESET_SQL_GZIP_B64=${TEMP_SQL_SECRET}:latest" \
  --command=/bin/sh \
  "--args=-ceu,${CLOUD_JOB_SCRIPT}" \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --memory=512Mi \
  --cpu=1 \
  --execute-now \
  --wait \
  --quiet

unset PREFLIGHT_PAYLOAD CLOUD_JOB_SCRIPT COMBINED_SQL FIREBASE_USER_SQL

printf "\n"
ok "Production user reset complete."
printf "  %-42s %s\n" "app.admin@cypressridge.test"          "Application administrator"
printf "  %-42s %s\n" "school.admin@cypressridge.test"       "School administrator"
printf "  %-42s %s\n" "robotics.admin@cypressridge.test"     "Club administrator"
printf "  %-42s %s\n" "arts.admin@cypressridge.test"         "Second club administrator"
printf "  %-42s %s\n" "member@cypressridge.test"             "Approved member"
printf "  %-42s %s\n" "pending@cypressridge.test"            "Pending school request"
printf "  %-42s %s\n" "club.pending@cypressridge.test"       "Pending club request"
printf "  %-42s %s\n" "school.rejected@cypressridge.test"    "Rejected school request"
printf "  %-42s %s\n" "club.rejected@cypressridge.test"      "Rejected club request"
printf "  %-42s %s\n" "deletion@cypressridge.test"           "Disposable deletion account"
printf "\n"
ok "All ten accounts use the Firebase password supplied for this run."
warn "The Cypress Ridge school, clubs, and fixture data have been re-seeded."
