#!/usr/bin/env bash
# Seed the reserved Cypress Ridge App Review fixture in production Cloud SQL.
#
# The database has private networking, so this script sends the existing,
# transaction-wrapped SQL fixture to a temporary Cloud Run Job. The shared
# review password is passed through a temporary Secret Manager secret and is
# never written to disk, included in a command argument, or stored in the job
# definition. Both temporary resources are deleted on exit.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SEED_FILE="${SCRIPT_DIR}/seed-mobile-demo.sql"
PREFLIGHT_FILE="${SCRIPT_DIR}/app-review-production-preflight.sql"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { printf "%b[app-review-production]%b %s\n" "$CYAN" "$NC" "$*"; }
ok() { printf "%b[app-review-production]%b %s\n" "$GREEN" "$NC" "$*"; }
warn() { printf "%b[app-review-production]%b %s\n" "$YELLOW" "$NC" "$*"; }
fail() { printf "%b[app-review-production]%b %s\n" "$RED" "$NC" "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: ./scripts/seed-app-review-production.sh [--plan | --yes]

Creates or refreshes the reserved Cypress Ridge Academy App Review fixture in
the production Cloud SQL database. It refreshes only:

  - the 10 explicitly listed @cypressridge.test review users
  - the school named Cypress Ridge Academy and records owned by that school

The script aborts before seeding if Cypress Ridge Academy has any association
with a non-review account (membership, content, RSVP, financial record,
inventory history, or moderation report).

The shared password is read without echo. For guarded automation, pass it only
at runtime in MSC_REVIEW_PASSWORD. --yes skips only the typed production phrase;
all cloud resource validation and collision protection still run.

--plan prints the complete fixture inventory and exits without contacting
Google Cloud or changing production.
EOF
}

print_plan() {
  cat <<'EOF'
Production App Review fixture plan (no changes)

Accounts (one shared runtime password, never stored in the repository):
  app.admin@cypressridge.test         application administrator
  school.admin@cypressridge.test      school administrator
  robotics.admin@cypressridge.test    Robotics club administrator
  arts.admin@cypressridge.test        Creative Arts club administrator
  member@cypressridge.test            approved school + club member
  pending@cypressridge.test           pending school membership
  club.pending@cypressridge.test      approved school + pending club membership
  school.rejected@cypressridge.test   rejected school membership
  club.rejected@cypressridge.test     approved school + rejected club membership
  deletion@cypressridge.test          disposable account with no deletion blockers

Populated feature states:
  1 school; 2 clubs; approved, pending, and rejected memberships
  6 announcements; 6 future events; YES/MAYBE/NO RSVPs
  8 invoices covering DRAFT, SUBMITTED, APPROVED, PAID, and CANCELLED
  8 inventory items covering available, checked out, overdue, and history
  10 notifications; 3 reports covering OPEN, UNDER_REVIEW, and RESOLVED

Safety and repeatability:
  read-only preflight; exact reserved-school scope; transaction + assertions
  idempotent refresh; temporary Cloud Run Job and password secret deleted on exit
EOF
}

AUTO_CONFIRM=false
case "${1:-}" in
  '') ;;
  --yes) AUTO_CONFIRM=true ;;
  --plan) print_plan; exit 0 ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 2 ;;
esac

# The plan path above is intentionally local-only and must not initialize or
# contact gcloud. Production configuration is loaded only for a real run.
# shellcheck source=scripts/config.sh
source "${SCRIPT_DIR}/config.sh"

command -v gcloud >/dev/null 2>&1 || fail "gcloud is required."
command -v gzip >/dev/null 2>&1 || fail "gzip is required."
command -v base64 >/dev/null 2>&1 || fail "base64 is required."
[[ -f "$SEED_FILE" ]] || fail "Seed fixture not found: ${SEED_FILE}"
[[ -f "$PREFLIGHT_FILE" ]] || fail "Preflight not found: ${PREFLIGHT_FILE}"

GCLOUD_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n 1)"
[[ -n "$GCLOUD_ACCOUNT" ]] || fail "No active gcloud account. Run: gcloud auth login"

GCP_JOB_PROJECT="${GCP_PROJECT_ID:-}"
[[ -n "$GCP_JOB_PROJECT" ]] || fail "GCP project is not configured."
GCP_JOB_REGION="${GCP_REGION:-us-central1}"
SQL_INSTANCE="${CLOUD_SQL_INSTANCE_NAME:-my-skool-club-db}"
DATABASE_NAME="${DB_NAME:-myskoolclub}"
SERVICE_ACCOUNT="${SA_NAME:-my-skool-club-sa}@${GCP_JOB_PROJECT}.iam.gserviceaccount.com"
VPC_NETWORK="${VPC_NETWORK_NAME:-my-skool-club-vpc}"
VPC_SUBNET="${VPC_SUBNET_NAME:-my-skool-club-run}"
USERNAME_SECRET="db-username"
PASSWORD_SECRET="db-password"

log "Validating production resources without changing them..."
INSTANCE_CONNECTION="$(gcloud sql instances describe "$SQL_INSTANCE" \
  --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" \
  --format='value(connectionName)')" || fail "Cloud SQL validation failed."
INSTANCE_REGION="$(gcloud sql instances describe "$SQL_INSTANCE" \
  --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" \
  --format='value(region)')"
INSTANCE_STATE="$(gcloud sql instances describe "$SQL_INSTANCE" \
  --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" \
  --format='value(state)')"
[[ "$INSTANCE_REGION" == "$GCP_JOB_REGION" ]] || \
  fail "Cloud SQL is in ${INSTANCE_REGION}, not ${GCP_JOB_REGION}."
[[ "$INSTANCE_STATE" == "RUNNABLE" ]] || \
  fail "Cloud SQL state is ${INSTANCE_STATE}, not RUNNABLE."

gcloud sql databases describe "$DATABASE_NAME" --instance="$SQL_INSTANCE" \
  --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" >/dev/null || \
  fail "Database ${DATABASE_NAME} was not found."
gcloud iam service-accounts describe "$SERVICE_ACCOUNT" \
  --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" >/dev/null || \
  fail "Service account ${SERVICE_ACCOUNT} was not found."
for secret_name in "$USERNAME_SECRET" "$PASSWORD_SECRET"; do
  gcloud secrets describe "$secret_name" \
    --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" >/dev/null || \
    fail "Secret ${secret_name} was not found."
done

REVIEW_PASSWORD="${MSC_REVIEW_PASSWORD:-}"
if [[ -z "$REVIEW_PASSWORD" ]]; then
  [[ -t 0 ]] || fail "Set MSC_REVIEW_PASSWORD when running non-interactively."
  printf "  Shared password for the 10 reserved review accounts: "
  IFS= read -r -s REVIEW_PASSWORD
  printf "\n"
  printf "  Confirm shared password: "
  IFS= read -r -s REVIEW_PASSWORD_CONFIRM
  printf "\n"
  [[ "$REVIEW_PASSWORD" == "$REVIEW_PASSWORD_CONFIRM" ]] || fail "Passwords did not match."
  unset REVIEW_PASSWORD_CONFIRM
fi

[[ "${#REVIEW_PASSWORD}" -ge 12 ]] || fail "Use a password with at least 12 characters."
[[ "$REVIEW_PASSWORD" =~ [A-Z] ]] || fail "The password needs an uppercase letter."
[[ "$REVIEW_PASSWORD" =~ [a-z] ]] || fail "The password needs a lowercase letter."
[[ "$REVIEW_PASSWORD" =~ [0-9] ]] || fail "The password needs a number."
[[ "$REVIEW_PASSWORD" =~ [^A-Za-z0-9] ]] || fail "The password needs a special character."
[[ "$REVIEW_PASSWORD" != *$'\n'* && "$REVIEW_PASSWORD" != *$'\r'* ]] || \
  fail "The password cannot contain a newline."

printf "\n"
warn "PRODUCTION App Review seed"
printf "  Account         : %s\n" "$GCLOUD_ACCOUNT"
printf "  Project         : %s\n" "$GCP_JOB_PROJECT"
printf "  Region          : %s\n" "$GCP_JOB_REGION"
printf "  Cloud SQL       : %s\n" "$INSTANCE_CONNECTION"
printf "  Database        : %s\n" "$DATABASE_NAME"
printf "  Reserved school : Cypress Ridge Academy\n"
printf "  Reserved users  : *@cypressridge.test\n\n"

if [[ "$AUTO_CONFIRM" != "true" ]]; then
  read -r -p "  Type SEED CYPRESS RIDGE IN PRODUCTION to continue: " confirmation
  [[ "$confirmation" == "SEED CYPRESS RIDGE IN PRODUCTION" ]] || \
    fail "Confirmation did not match; nothing changed."
fi

RESOURCE_SUFFIX="$(date +%s)-$$"
TEMP_JOB_NAME="msc-app-review-seed-${RESOURCE_SUFFIX}"
TEMP_PASSWORD_SECRET="msc-app-review-password-${RESOURCE_SUFFIX}"

cleanup() {
  local cleanup_exit_code=$?
  trap - EXIT INT TERM
  if gcloud run jobs describe "$TEMP_JOB_NAME" \
      --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" \
      --region="$GCP_JOB_REGION" >/dev/null 2>&1; then
    log "Deleting temporary Cloud Run Job ${TEMP_JOB_NAME}..."
    gcloud run jobs delete "$TEMP_JOB_NAME" \
      --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" \
      --region="$GCP_JOB_REGION" --quiet >/dev/null 2>&1 || \
      warn "Could not delete temporary job ${TEMP_JOB_NAME}."
  fi
  if gcloud secrets describe "$TEMP_PASSWORD_SECRET" \
      --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" >/dev/null 2>&1; then
    log "Deleting temporary password secret ${TEMP_PASSWORD_SECRET}..."
    gcloud secrets delete "$TEMP_PASSWORD_SECRET" \
      --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" \
      --quiet >/dev/null 2>&1 || \
      warn "Could not delete temporary secret ${TEMP_PASSWORD_SECRET}."
  fi
  unset REVIEW_PASSWORD MSC_REVIEW_PASSWORD
  exit "$cleanup_exit_code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

log "Creating a temporary Secret Manager value for the review password..."
printf '%s' "$REVIEW_PASSWORD" | gcloud secrets create "$TEMP_PASSWORD_SECRET" \
  --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" \
  --replication-policy=automatic --data-file=- --quiet >/dev/null

# Cloud Run resolves the secret as the runtime service account. Grant access
# only to this one temporary secret, then delete the entire secret in cleanup.
gcloud secrets add-iam-policy-binding "$TEMP_PASSWORD_SECRET" \
  --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role='roles/secretmanager.secretAccessor' --quiet >/dev/null

SEED_PAYLOAD="$(gzip -c "$SEED_FILE" | base64 | tr -d '\n')"
PREFLIGHT_PAYLOAD="$(gzip -c "$PREFLIGHT_FILE" | base64 | tr -d '\n')"

# Run the read-only collision check before the transaction-wrapped fixture.
# The SQL reads DEMO_PASSWORD from the secret-backed environment variable, so
# the plaintext password never appears in the job's process arguments.
CLOUD_JOB_SCRIPT='printf "%s" "$PREFLIGHT_SQL_GZIP_B64" | base64 -d | gzip -d > /tmp/app-review-preflight.sql
printf "%s" "$SEED_SQL_GZIP_B64" | base64 -d | gzip -d > /tmp/app-review-seed.sql
psql -X -q -v ON_ERROR_STOP=1 -f /tmp/app-review-preflight.sql
psql -X -q -v ON_ERROR_STOP=1 -f /tmp/app-review-seed.sql'

log "Deploying and executing temporary Cloud Run Job ${TEMP_JOB_NAME}..."
gcloud run jobs deploy "$TEMP_JOB_NAME" \
  --account="$GCLOUD_ACCOUNT" \
  --project="$GCP_JOB_PROJECT" \
  --region="$GCP_JOB_REGION" \
  --image='docker.io/library/postgres:16-alpine' \
  --service-account="$SERVICE_ACCOUNT" \
  --set-cloudsql-instances="$INSTANCE_CONNECTION" \
  --network="$VPC_NETWORK" \
  --subnet="$VPC_SUBNET" \
  --vpc-egress=private-ranges-only \
  --set-env-vars="PGHOST=/cloudsql/${INSTANCE_CONNECTION},PGPORT=5432,PGDATABASE=${DATABASE_NAME},PGSSLMODE=disable,PREFLIGHT_SQL_GZIP_B64=${PREFLIGHT_PAYLOAD},SEED_SQL_GZIP_B64=${SEED_PAYLOAD}" \
  --set-secrets="PGUSER=${USERNAME_SECRET}:latest,PGPASSWORD=${PASSWORD_SECRET}:latest,DEMO_PASSWORD=${TEMP_PASSWORD_SECRET}:latest" \
  --command=/bin/sh \
  "--args=-ceu,${CLOUD_JOB_SCRIPT}" \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=5m \
  --memory=512Mi \
  --cpu=1 \
  --execute-now \
  --wait \
  --quiet

unset PREFLIGHT_PAYLOAD SEED_PAYLOAD CLOUD_JOB_SCRIPT

printf "\n"
ok "Production App Review dataset verified by the transaction assertions."
printf "  %-38s %s\n" "app.admin@cypressridge.test" "Application administrator"
printf "  %-38s %s\n" "school.admin@cypressridge.test" "School administrator"
printf "  %-38s %s\n" "robotics.admin@cypressridge.test" "Club administrator"
printf "  %-38s %s\n" "arts.admin@cypressridge.test" "Second club administrator"
printf "  %-38s %s\n" "member@cypressridge.test" "Approved member"
printf "  %-38s %s\n" "pending@cypressridge.test" "Pending school request"
printf "  %-38s %s\n" "club.pending@cypressridge.test" "Pending club request"
printf "  %-38s %s\n" "school.rejected@cypressridge.test" "Rejected school request"
printf "  %-38s %s\n" "club.rejected@cypressridge.test" "Rejected club request"
printf "  %-38s %s\n" "deletion@cypressridge.test" "Disposable deletion account"
printf "\n"
ok "All 10 accounts use the password supplied for this run."
