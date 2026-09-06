#!/usr/bin/env bash
# Seed a screenshot-ready school in the local Docker PostgreSQL database.
#
# This script is intentionally local-only. It targets the `postgres` service
# from this repository's docker-compose.yml and refuses every database name
# except myskoolclub_dev. The demo password is read without echo and is passed
# to psql at runtime; it is never written to the repository or a local file.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"
SEED_FILE="${SCRIPT_DIR}/seed-mobile-demo.sql"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { printf "%b[mobile-demo]%b %s\n" "$CYAN" "$NC" "$*"; }
ok() { printf "%b[mobile-demo]%b %s\n" "$GREEN" "$NC" "$*"; }
warn() { printf "%b[mobile-demo]%b %s\n" "$YELLOW" "$NC" "$*"; }
fail() { printf "%b[mobile-demo]%b %s\n" "$RED" "$NC" "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: ./scripts/seed-mobile-demo.sh

Creates or refreshes the screenshot-only "Cypress Ridge Academy" dataset in
the local Docker database. The command prompts for a shared demo password.

For non-interactive local automation, provide the password only at runtime:

  MSC_DEMO_PASSWORD='your-local-password' ./scripts/seed-mobile-demo.sh

The password must be at least 8 characters and may contain letters, numbers,
spaces, and common punctuation. It is never printed or stored by the script.

Safety guarantees:
  - only the Docker Compose `postgres` service is used
  - only the exact database name `myskoolclub_dev` is accepted
  - no Google Cloud command or deployed API is called
  - unrelated local schools and users are not deleted
EOF
}

case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
  '') ;;
  *)
    usage >&2
    exit 2
    ;;
esac

command -v docker >/dev/null 2>&1 || fail "Docker is required."
docker compose version >/dev/null 2>&1 || fail "Docker Compose is not available."
[[ -f "$SEED_FILE" ]] || fail "Seed fixture not found: ${SEED_FILE}"

# Load only local Compose overrides. This file is ignored by Git.
if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

log "Starting the repository's local PostgreSQL container..."
docker compose -f "$COMPOSE_FILE" up -d postgres >/dev/null

for attempt in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -q 2>/dev/null; then
    break
  fi
  [[ "$attempt" -eq 30 ]] && fail "Local PostgreSQL did not become ready in time."
  sleep 1
done

DB_NAME="$(docker compose -f "$COMPOSE_FILE" exec -T postgres printenv POSTGRES_DB 2>/dev/null | tr -d '\r')"
DB_USER="$(docker compose -f "$COMPOSE_FILE" exec -T postgres printenv POSTGRES_USER 2>/dev/null | tr -d '\r')"
DB_NAME="${DB_NAME:-myskoolclub_dev}"
DB_USER="${DB_USER:-postgres}"

[[ "$DB_NAME" == "myskoolclub_dev" ]] || \
  fail "Refusing database '${DB_NAME}'. This script only permits myskoolclub_dev."

ACTUAL_DB="$(docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -X -q -U "$DB_USER" -d "$DB_NAME" -A -t -c 'SELECT current_database();' 2>/dev/null | tr -d '\r')"
[[ "$ACTUAL_DB" == "myskoolclub_dev" ]] || \
  fail "Connected to '${ACTUAL_DB:-unknown}', not myskoolclub_dev. Nothing was changed."

SCHEMA_READY="$(docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -X -q -U "$DB_USER" -d "$DB_NAME" -A -t \
  -c "SELECT to_regclass('public.users') IS NOT NULL AND to_regclass('public.content_reports') IS NOT NULL;" \
  2>/dev/null | tr -d '\r')"
[[ "$SCHEMA_READY" == "t" ]] || fail "The development schema is not initialized. Start ./scripts/dev.sh --api-only once, then rerun this command."

DEMO_PASSWORD="${MSC_DEMO_PASSWORD:-}"
if [[ -z "$DEMO_PASSWORD" ]]; then
  [[ -t 0 ]] || fail "Set MSC_DEMO_PASSWORD when running without an interactive terminal."
  printf "  Shared password for all demo accounts: "
  IFS= read -r -s DEMO_PASSWORD
  printf "\n"
  printf "  Confirm demo password: "
  IFS= read -r -s DEMO_PASSWORD_CONFIRM
  printf "\n"
  [[ "$DEMO_PASSWORD" == "$DEMO_PASSWORD_CONFIRM" ]] || fail "Passwords did not match."
  unset DEMO_PASSWORD_CONFIRM
fi

[[ "${#DEMO_PASSWORD}" -ge 8 ]] || fail "The demo password must be at least 8 characters."
[[ "$DEMO_PASSWORD" != *$'\n'* && "$DEMO_PASSWORD" != *$'\r'* ]] || \
  fail "The demo password cannot contain a newline."

warn "Refreshing Cypress Ridge Academy in local database ${DB_NAME}."

# -v passes the password only to this psql process. The SQL fixture uses
# psql's :'demo_password' quoting and PostgreSQL bcrypt hashing; the plaintext
# value is neither printed nor persisted.
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -X -q -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 -v "demo_password=${DEMO_PASSWORD}" \
  -f /dev/stdin < "$SEED_FILE"

unset DEMO_PASSWORD MSC_DEMO_PASSWORD

printf "\n"
ok "Cypress Ridge Academy is ready for mobile screenshots."
printf "\n"
printf "  %-34s %s\n" "Account" "Screenshot role"
printf "  %-34s %s\n" "app.admin@cypressridge.test" "Application admin"
printf "  %-34s %s\n" "school.admin@cypressridge.test" "School admin"
printf "  %-34s %s\n" "robotics.admin@cypressridge.test" "Robotics club admin"
printf "  %-34s %s\n" "arts.admin@cypressridge.test" "Creative Arts club admin"
printf "  %-34s %s\n" "member@cypressridge.test" "School and club member"
printf "  %-34s %s\n" "pending@cypressridge.test" "Pending school request"
printf "  %-34s %s\n" "club.pending@cypressridge.test" "Pending club request"
printf "  %-34s %s\n" "school.rejected@cypressridge.test" "Rejected school request"
printf "  %-34s %s\n" "club.rejected@cypressridge.test" "Rejected club request"
printf "  %-34s %s\n" "deletion@cypressridge.test" "Disposable deletion account"
printf "\n"
printf "  All accounts use the password entered for this run.\n"
printf "  Start the app with: %s\n" "./scripts/mobile-dev.sh"
