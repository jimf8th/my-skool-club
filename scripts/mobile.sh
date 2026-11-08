#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"
ENVIRONMENT="${1:-}"

usage() {
  cat <<'EOF'
Usage: ./scripts/mobile.sh <dev|test|prod> [Expo start options]

Convenience launchers:
  ./scripts/mobile-dev.sh
  ./scripts/mobile-test.sh
  ./scripts/mobile-prod.sh

The default Expo target is Expo Go. To use an installed native variant:
  ./scripts/mobile-dev.sh --dev-client --clear
  ./scripts/mobile-test.sh --dev-client --clear
EOF
}

if [[ -z "$ENVIRONMENT" || "$ENVIRONMENT" == "--help" || "$ENVIRONMENT" == "-h" ]]; then
  usage
  [[ -n "$ENVIRONMENT" ]] && exit 0
  exit 2
fi
shift

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

case "$ENVIRONMENT" in
  dev|test|prod) ;;
  *)
    usage >&2
    exit 2
    ;;
esac

EXPO_ARGS=("$@")
if [[ ${#EXPO_ARGS[@]} -eq 0 ]]; then
  EXPO_ARGS=(--go --clear)
fi

API_STACK_PID=""
_CLEANED_UP=false

cleanup() {
  $_CLEANED_UP && return
  _CLEANED_UP=true
  if [[ -n "$API_STACK_PID" ]] && kill -0 "$API_STACK_PID" 2>/dev/null; then
    echo "[mobile:${ENVIRONMENT}] Stopping the local Spring Boot API..."
    kill -TERM "$API_STACK_PID" 2>/dev/null || true
    wait "$API_STACK_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

wait_for_api() {
  local url="$1"
  local attempts="$2"
  local label="$3"

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl -fsS --max-time 3 "$url" >/dev/null 2>&1; then
      echo "[mobile:${ENVIRONMENT}] ${label} is ready: ${url}"
      return 0
    fi
    if [[ -n "$API_STACK_PID" ]] && ! kill -0 "$API_STACK_PID" 2>/dev/null; then
      wait "$API_STACK_PID" || true
      echo "[mobile:${ENVIRONMENT}] Local API process exited before becoming ready." >&2
      return 1
    fi
    sleep 1
  done

  echo "[mobile:${ENVIRONMENT}] Could not reach ${label}: ${url}" >&2
  return 1
}

if [[ "$ENVIRONMENT" == "dev" ]]; then
  if curl -fsS --max-time 2 "http://localhost:8080/api/health" >/dev/null 2>&1; then
    echo "[mobile:dev] Reusing the local API already running on port 8080."
  else
    echo "[mobile:dev] Starting Docker PostgreSQL/MailHog and the local Spring Boot API..."
    "$SCRIPT_DIR/dev.sh" --api-only &
    API_STACK_PID=$!
    wait_for_api "http://localhost:8080/api/health" 90 "local API"
  fi
else
  echo "[mobile:${ENVIRONMENT}] WARNING: this environment uses production API data."
  wait_for_api "https://myskoolclub.com/api/health" 3 "deployed API"
fi

echo "[mobile:${ENVIRONMENT}] Starting Expo with: ${EXPO_ARGS[*]}"
cd "$MOBILE_DIR"
npm run "start:${ENVIRONMENT}" -- "${EXPO_ARGS[@]}"
