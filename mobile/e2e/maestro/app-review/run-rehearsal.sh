#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ID="${APP_ID:-com.myskoolclub.app.test}"
MODE="${1:-}"
MAESTRO_ENV_ARGS=(-e "APP_ID=${APP_ID}")

usage() {
  printf '%s\n' "Usage: ./e2e/maestro/app-review/run-rehearsal.sh {public|member|school-admin|club-admin|app-admin}"
}

fail() {
  printf 'app-review rehearsal: %s\n' "$*" >&2
  exit 1
}

prompt_value() {
  local variable_name="$1"
  local prompt="$2"
  local secret="${3:-false}"
  local current_value="${!variable_name:-}"

  if [[ -n "$current_value" ]]; then
    return
  fi

  [[ -t 0 ]] || fail "Set ${variable_name} when running non-interactively."
  if [[ "$secret" == "true" ]]; then
    IFS= read -r -s -p "$prompt: " current_value
    printf '\n'
  else
    IFS= read -r -p "$prompt: " current_value
  fi
  [[ -n "$current_value" ]] || fail "${variable_name} is required."
  printf -v "$variable_name" '%s' "$current_value"
  export "$variable_name"
}

case "$APP_ID" in
  com.myskoolclub.app.test|com.myskoolclub.app.dev) ;;
  com.myskoolclub.app)
    fail "The rehearsal runner refuses the production bundle ID. Use the physical TestFlight runbook manually."
    ;;
  *) fail "Unexpected APP_ID: ${APP_ID}" ;;
esac

export APP_ID

case "$MODE" in
  public)
    FLOW="00-public.yaml"
    ;;
  member)
    prompt_value E2E_MEMBER_EMAIL "Member review email"
    prompt_value E2E_MEMBER_PASSWORD "Member review password" true
    MAESTRO_ENV_ARGS+=(
      -e "E2E_MEMBER_EMAIL=${E2E_MEMBER_EMAIL}"
      -e "E2E_MEMBER_PASSWORD=${E2E_MEMBER_PASSWORD}"
    )
    FLOW="10-member.yaml"
    ;;
  school-admin)
    prompt_value E2E_SCHOOL_ADMIN_EMAIL "School-admin review email"
    prompt_value E2E_SCHOOL_ADMIN_PASSWORD "School-admin review password" true
    MAESTRO_ENV_ARGS+=(
      -e "E2E_SCHOOL_ADMIN_EMAIL=${E2E_SCHOOL_ADMIN_EMAIL}"
      -e "E2E_SCHOOL_ADMIN_PASSWORD=${E2E_SCHOOL_ADMIN_PASSWORD}"
    )
    FLOW="20-school-admin.yaml"
    ;;
  club-admin)
    prompt_value E2E_CLUB_ADMIN_EMAIL "Club-admin review email"
    prompt_value E2E_CLUB_ADMIN_PASSWORD "Club-admin review password" true
    MAESTRO_ENV_ARGS+=(
      -e "E2E_CLUB_ADMIN_EMAIL=${E2E_CLUB_ADMIN_EMAIL}"
      -e "E2E_CLUB_ADMIN_PASSWORD=${E2E_CLUB_ADMIN_PASSWORD}"
    )
    FLOW="30-club-admin.yaml"
    ;;
  app-admin)
    prompt_value E2E_APP_ADMIN_EMAIL "App-admin review email"
    prompt_value E2E_APP_ADMIN_PASSWORD "App-admin review password" true
    MAESTRO_ENV_ARGS+=(
      -e "E2E_APP_ADMIN_EMAIL=${E2E_APP_ADMIN_EMAIL}"
      -e "E2E_APP_ADMIN_PASSWORD=${E2E_APP_ADMIN_PASSWORD}"
    )
    FLOW="40-app-admin.yaml"
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

command -v maestro >/dev/null 2>&1 || fail "Maestro is not installed. See docs/app-review-recording-runbook.md."

printf 'Running %s against %s on an iOS Simulator.\n' "$FLOW" "$APP_ID"
printf 'This is rehearsal footage only; do not submit it to Apple.\n'
exec maestro test "${MAESTRO_ENV_ARGS[@]}" "${SCRIPT_DIR}/${FLOW}"
