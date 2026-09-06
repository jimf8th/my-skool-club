#!/usr/bin/env bash
# Promote one existing, verified, enabled user to APP_ADMIN.
#
# Local mode updates the PostgreSQL service from docker-compose.yml.
# GCP mode runs psql in a short-lived Cloud Run Job so the private Cloud SQL
# instance never needs a public address. Database credentials remain in Secret
# Manager; this script asks only for the secret resource names.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# These are non-secret defaults. Every cloud value is still presented as an
# interactive question before any Google Cloud resource is changed.
# shellcheck source=scripts/config.sh
source "${SCRIPT_DIR}/config.sh"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { printf "%b[set-app-admin]%b %s\n" "$CYAN" "$NC" "$*"; }
ok() { printf "%b[set-app-admin]%b %s\n" "$GREEN" "$NC" "$*"; }
warn() { printf "%b[set-app-admin]%b %s\n" "$YELLOW" "$NC" "$*"; }
fail() { printf "%b[set-app-admin]%b %s\n" "$RED" "$NC" "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: ./scripts/set-app-admin.sh [local|gcp]

Promotes one existing, email-verified, enabled user to APP_ADMIN.

  local  Update the Docker Compose PostgreSQL database.
  gcp    Update private Cloud SQL through a temporary Cloud Run Job.

With no argument, the script asks which target to use. GCP mode asks for every
Google Cloud setting and requires an exact production confirmation. Passwords
are never requested, printed, or stored; the job reads existing Secret Manager
resources at runtime.
EOF
}

prompt_default() {
  local label="$1"
  local default_value="$2"
  local entered
  read -r -p "  ${label} [${default_value}]: " entered
  REPLY_VALUE="${entered:-$default_value}"
}

prompt_required() {
  local label="$1"
  local entered
  read -r -p "  ${label}: " entered
  [[ -n "$entered" ]] || fail "${label} is required."
  REPLY_VALUE="$entered"
}

validate_email() {
  local email="$1"
  [[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$ ]] || \
    fail "Enter a valid email address."
}

validate_resource_value() {
  local label="$1"
  local value="$2"
  [[ "$value" =~ ^[A-Za-z0-9._@:/+-]+$ ]] || \
    fail "${label} contains unsupported characters."
}

TARGET="${1:-}"
case "$TARGET" in
  -h|--help)
    usage
    exit 0
    ;;
  local|gcp) ;;
  '')
    prompt_default "Database target (local or gcp)" "local"
    TARGET="$(printf '%s' "$REPLY_VALUE" | tr '[:upper:]' '[:lower:]')"
    [[ "$TARGET" == "local" || "$TARGET" == "gcp" ]] || \
      fail "Database target must be local or gcp."
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

prompt_required "Email of the user to promote"
TARGET_EMAIL="$REPLY_VALUE"
validate_email "$TARGET_EMAIL"

promote_local() {
  command -v docker >/dev/null 2>&1 || fail "Docker is required for local mode."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose is not available."

  local db_name
  local db_user
  local current
  local confirmation
  local promoted

  if ! docker compose -f "${ROOT_DIR}/docker-compose.yml" ps --status running \
      --services postgres 2>/dev/null | grep -qx 'postgres'; then
    fail "The local PostgreSQL service is not running. Start it with: docker compose up -d postgres"
  fi

  # Read the effective values from the running container so .env or exported
  # Docker Compose overrides are honored without reading a password.
  db_name="$(docker compose -f "${ROOT_DIR}/docker-compose.yml" exec -T postgres \
    printenv POSTGRES_DB 2>/dev/null | tr -d '\r')"
  db_user="$(docker compose -f "${ROOT_DIR}/docker-compose.yml" exec -T postgres \
    printenv POSTGRES_USER 2>/dev/null | tr -d '\r')"
  db_name="${db_name:-myskoolclub_dev}"
  db_user="${db_user:-postgres}"

  current="$(docker compose -f "${ROOT_DIR}/docker-compose.yml" exec -T postgres \
    psql -X -q -U "$db_user" -d "$db_name" -v ON_ERROR_STOP=1 \
      -v target_email="$TARGET_EMAIL" -A -t -F '|' <<'SQL'
SELECT email, app_role, email_verified, enabled
FROM users
WHERE lower(email) = lower(:'target_email');
SQL
)"

  [[ -n "$current" ]] || fail "No local user was found for ${TARGET_EMAIL}. Register the user first."
  IFS='|' read -r found_email current_role email_verified enabled <<<"$current"
  [[ "$email_verified" == "t" && "$enabled" == "t" ]] || \
    fail "The user must be email-verified and enabled before promotion. Current record: ${current}"

  if [[ "$current_role" == "APP_ADMIN" ]]; then
    ok "${found_email} is already an APP_ADMIN in the local database."
    return 0
  fi

  printf "\n"
  warn "Local database: ${db_name}"
  warn "User: ${found_email} (${current_role} -> APP_ADMIN)"
  read -r -p "  Type PROMOTE ${found_email} to continue: " confirmation
  [[ "$confirmation" == "PROMOTE ${found_email}" ]] || fail "Confirmation did not match; nothing changed."

  promoted="$(docker compose -f "${ROOT_DIR}/docker-compose.yml" exec -T postgres \
    psql -X -q -U "$db_user" -d "$db_name" -v ON_ERROR_STOP=1 \
      -v target_email="$TARGET_EMAIL" -A -t -F '|' <<'SQL'
UPDATE users
SET app_role = 'APP_ADMIN'
WHERE lower(email) = lower(:'target_email')
  AND email_verified = true
  AND enabled = true
RETURNING email, app_role, email_verified, enabled;
SQL
)"

  [[ -n "$promoted" ]] || fail "The user changed or became unavailable before promotion; nothing was updated."
  ok "Local promotion complete: ${promoted}"
}

TEMP_JOB_NAME=""
GCLOUD_ACCOUNT=""
GCP_JOB_PROJECT=""
GCP_JOB_REGION=""

cleanup_cloud_job() {
  local exit_code=$?
  if [[ -n "$TEMP_JOB_NAME" ]]; then
    local job_to_delete="$TEMP_JOB_NAME"
    TEMP_JOB_NAME=""
    log "Deleting temporary Cloud Run Job ${job_to_delete}..."
    gcloud run jobs delete "$job_to_delete" \
      --account="$GCLOUD_ACCOUNT" \
      --project="$GCP_JOB_PROJECT" \
      --region="$GCP_JOB_REGION" \
      --quiet >/dev/null 2>&1 || \
      warn "Could not delete ${job_to_delete}; remove it manually from Cloud Run Jobs."
  fi
  return "$exit_code"
}

promote_gcp() {
  command -v gcloud >/dev/null 2>&1 || fail "The Google Cloud CLI (gcloud) is required for GCP mode."

  local active_account
  local active_project
  local default_service_account
  local instance_connection
  local instance_region
  local instance_state
  local secret_version
  local confirmation
  local cloud_job_script

  active_account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n 1)"
  active_project="$(gcloud config get-value project 2>/dev/null || true)"
  [[ "$active_project" != "(unset)" ]] || active_project=""

  printf "\n"
  warn "GCP mode changes the production database. Review every answer carefully."
  printf "  Passwords are not requested. Existing Secret Manager resources are used.\n\n"

  prompt_default "Google Cloud account" "${active_account:-your-account@example.com}"
  GCLOUD_ACCOUNT="$REPLY_VALUE"
  prompt_default "Google Cloud project ID" "${GCP_PROJECT_ID:-${active_project:-your-project-id}}"
  GCP_JOB_PROJECT="$REPLY_VALUE"
  prompt_default "Google Cloud region" "${GCP_REGION:-us-central1}"
  GCP_JOB_REGION="$REPLY_VALUE"
  prompt_default "Cloud SQL instance name" "${CLOUD_SQL_INSTANCE_NAME:-my-skool-club-db}"
  local sql_instance="$REPLY_VALUE"
  prompt_default "PostgreSQL database name" "${DB_NAME:-myskoolclub}"
  local database_name="$REPLY_VALUE"
  default_service_account="${SA_NAME:-my-skool-club-sa}@${GCP_JOB_PROJECT}.iam.gserviceaccount.com"
  prompt_default "Cloud Run service account email" "$default_service_account"
  local service_account="$REPLY_VALUE"
  prompt_default "VPC network name" "${VPC_NETWORK_NAME:-my-skool-club-vpc}"
  local vpc_network="$REPLY_VALUE"
  prompt_default "VPC subnet name" "${VPC_SUBNET_NAME:-my-skool-club-run}"
  local vpc_subnet="$REPLY_VALUE"
  prompt_default "Secret Manager name containing the database username" "db-username"
  local username_secret="$REPLY_VALUE"
  prompt_default "Secret Manager name containing the database password" "db-password"
  local password_secret="$REPLY_VALUE"

  validate_resource_value "Google Cloud account" "$GCLOUD_ACCOUNT"
  validate_resource_value "Google Cloud project ID" "$GCP_JOB_PROJECT"
  validate_resource_value "Google Cloud region" "$GCP_JOB_REGION"
  validate_resource_value "Cloud SQL instance name" "$sql_instance"
  validate_resource_value "Database name" "$database_name"
  validate_resource_value "Service account" "$service_account"
  validate_resource_value "VPC network" "$vpc_network"
  validate_resource_value "VPC subnet" "$vpc_subnet"
  validate_resource_value "Username secret" "$username_secret"
  validate_resource_value "Password secret" "$password_secret"

  log "Validating Google Cloud configuration (read-only)..."
  instance_connection="$(gcloud sql instances describe "$sql_instance" \
    --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" \
    --format='value(connectionName)')" || fail "Cloud SQL instance validation failed."
  instance_region="$(gcloud sql instances describe "$sql_instance" \
    --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" \
    --format='value(region)')"
  instance_state="$(gcloud sql instances describe "$sql_instance" \
    --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" \
    --format='value(state)')"
  [[ "$instance_region" == "$GCP_JOB_REGION" ]] || \
    fail "Cloud SQL is in ${instance_region}, not ${GCP_JOB_REGION}."
  [[ "$instance_state" == "RUNNABLE" ]] || fail "Cloud SQL state is ${instance_state}, not RUNNABLE."

  gcloud sql databases describe "$database_name" --instance="$sql_instance" \
    --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" >/dev/null || \
    fail "Database ${database_name} was not found."
  gcloud iam service-accounts describe "$service_account" \
    --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" >/dev/null || \
    fail "Service account ${service_account} was not found."
  gcloud compute networks describe "$vpc_network" \
    --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" >/dev/null || \
    fail "VPC network ${vpc_network} was not found."
  gcloud compute networks subnets describe "$vpc_subnet" --region="$GCP_JOB_REGION" \
    --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" >/dev/null || \
    fail "VPC subnet ${vpc_subnet} was not found."

  for secret_name in "$username_secret" "$password_secret"; do
    gcloud secrets describe "$secret_name" \
      --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" >/dev/null || \
      fail "Secret ${secret_name} was not found."
    secret_version="$(gcloud secrets versions list "$secret_name" \
      --account="$GCLOUD_ACCOUNT" --project="$GCP_JOB_PROJECT" \
      --filter='state=ENABLED' --limit=1 --format='value(name)')"
    [[ -n "$secret_version" ]] || fail "Secret ${secret_name} has no enabled version."
  done

  printf "\n"
  warn "PRODUCTION promotion summary"
  printf "  Account         : %s\n" "$GCLOUD_ACCOUNT"
  printf "  Project         : %s\n" "$GCP_JOB_PROJECT"
  printf "  Region          : %s\n" "$GCP_JOB_REGION"
  printf "  Cloud SQL       : %s\n" "$instance_connection"
  printf "  Database        : %s\n" "$database_name"
  printf "  User            : %s -> APP_ADMIN\n" "$TARGET_EMAIL"
  printf "  Service account : %s\n" "$service_account"
  printf "  Network/subnet  : %s / %s\n\n" "$vpc_network" "$vpc_subnet"
  read -r -p "  Type PROMOTE ${TARGET_EMAIL} IN PRODUCTION to continue: " confirmation
  [[ "$confirmation" == "PROMOTE ${TARGET_EMAIL} IN PRODUCTION" ]] || \
    fail "Confirmation did not match; nothing changed."

  TEMP_JOB_NAME="msc-set-app-admin-$(date +%s)"
  trap cleanup_cloud_job EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

  # Keep this command free of secret material. PGUSER and PGPASSWORD are
  # injected directly from Secret Manager by Cloud Run.
  cloud_job_script='result="$(psql -X -q -v ON_ERROR_STOP=1 -Atc "UPDATE users SET app_role = '\''APP_ADMIN'\'' WHERE lower(email) = lower('\''${TARGET_EMAIL}'\'') AND email_verified = true AND enabled = true RETURNING email;")"
if [ -z "$result" ]; then
  echo "No enabled and email-verified user matched ${TARGET_EMAIL}; nothing changed." >&2
  exit 4
fi
printf "Promoted %s to APP_ADMIN.\n" "$result"'

  log "Creating and executing temporary Cloud Run Job ${TEMP_JOB_NAME}..."
  gcloud run jobs deploy "$TEMP_JOB_NAME" \
    --account="$GCLOUD_ACCOUNT" \
    --project="$GCP_JOB_PROJECT" \
    --region="$GCP_JOB_REGION" \
    --image="docker.io/library/postgres:16-alpine" \
    --service-account="$service_account" \
    --set-cloudsql-instances="$instance_connection" \
    --network="$vpc_network" \
    --subnet="$vpc_subnet" \
    --vpc-egress=private-ranges-only \
    --set-env-vars="PGHOST=/cloudsql/${instance_connection},PGPORT=5432,PGDATABASE=${database_name},PGSSLMODE=disable,TARGET_EMAIL=${TARGET_EMAIL}" \
    --set-secrets="PGUSER=${username_secret}:latest,PGPASSWORD=${password_secret}:latest" \
    --command=/bin/sh \
    "--args=-ceu,${cloud_job_script}" \
    --tasks=1 \
    --max-retries=0 \
    --task-timeout=5m \
    --memory=512Mi \
    --cpu=1 \
    --execute-now \
    --wait \
    --quiet

  ok "Production promotion completed for ${TARGET_EMAIL}."
}

case "$TARGET" in
  local) promote_local ;;
  gcp) promote_gcp ;;
esac

printf "\n"
ok "Restart the mobile app or sign out and back in to refresh the cached profile."
