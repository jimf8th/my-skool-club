#!/usr/bin/env bash
# Create or refresh the production App Review fixture, verify the app, and
# record the read-only Maestro rehearsal on an iOS Simulator.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MOBILE_DIR="${ROOT_DIR}/mobile"
REHEARSAL_RUNNER="${MOBILE_DIR}/e2e/maestro/app-review/run-rehearsal.sh"
APP_ID="com.myskoolclub.app.test"
SEED_PRODUCTION=false
RUN_TESTS=true
OUTPUT_FILE="${ROOT_DIR}/artifacts/app-review-simulator-$(date +%Y%m%d-%H%M%S).mp4"
RECORDING_PID=""

log() { printf '[app-review-recording] %s\n' "$*"; }
fail() { printf '[app-review-recording] %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: ./scripts/record-app-review-simulator.sh [options]

Options:
  --seed-production  Refresh the guarded Cypress Ridge production fixture first
  --skip-tests       Skip the mobile Jest preflight
  --output FILE      Write the simulator recording to FILE
  --plan             Show the production fixture and recording plan, then exit
  -h, --help         Show this help

The test app (com.myskoolclub.app.test) must already be installed on exactly
one booted iOS Simulator. This creates rehearsal footage only; App Store Review
footage must still be recorded from the production TestFlight app on an iPhone.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --seed-production)
      SEED_PRODUCTION=true
      shift
      ;;
    --skip-tests)
      RUN_TESTS=false
      shift
      ;;
    --output)
      [[ $# -ge 2 ]] || fail "--output requires a file path."
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --plan)
      "${SCRIPT_DIR}/seed-app-review-production.sh" --plan
      printf '\nSimulator recording plan (no changes)\n'
      printf '  1. Validate production endpoints and mobile tests\n'
      printf '  2. Require one booted simulator with %s installed\n' "$APP_ID"
      printf '  3. Record public, member, school-admin, club-admin, and app-admin flows\n'
      exit 0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
done

[[ "$(uname -s)" == "Darwin" ]] || fail "iOS Simulator recording requires macOS."
JAVA_21_HOME=""
if [[ -x "/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home/bin/java" ]]; then
  JAVA_21_HOME="/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home"
else
  JAVA_21_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
fi
if [[ -n "$JAVA_21_HOME" ]]; then
  export JAVA_HOME="$JAVA_21_HOME"
  export PATH="${JAVA_HOME}/bin:${PATH}"
fi
for command_name in xcrun curl maestro; do
  command -v "$command_name" >/dev/null 2>&1 || fail "${command_name} is required."
done
[[ -x "$REHEARSAL_RUNNER" ]] || fail "Rehearsal runner is not executable: ${REHEARSAL_RUNNER}"

NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" && -x "${MOBILE_DIR}/node/node" ]]; then
  NODE_BIN="${MOBILE_DIR}/node/node"
fi
[[ -n "$NODE_BIN" ]] || fail "Node.js is required to inspect the booted simulators."

NPM_BIN="$(command -v npm || true)"
if [[ -z "$NPM_BIN" && -x "${MOBILE_DIR}/node/npm" ]]; then
  NPM_BIN="${MOBILE_DIR}/node/npm"
fi
[[ -n "$NPM_BIN" ]] || fail "npm is required to run the mobile preflight."

SIMULATOR_UDID="$(xcrun simctl list devices booted --json | "$NODE_BIN" -e '
  let input = "";
  process.stdin.on("data", chunk => input += chunk);
  process.stdin.on("end", () => {
    const devices = Object.values(JSON.parse(input).devices).flat()
      .filter(device => device.state === "Booted" && device.isAvailable !== false);
    if (devices.length !== 1) {
      console.error(`Expected exactly one booted simulator; found ${devices.length}.`);
      process.exit(3);
    }
    process.stdout.write(devices[0].udid);
  });
')" || fail "Boot exactly one iOS Simulator and retry."

xcrun simctl get_app_container "$SIMULATOR_UDID" "$APP_ID" app >/dev/null 2>&1 || \
  fail "${APP_ID} is not installed. Run: cd mobile && npm run ios:test"

REVIEW_PASSWORD="${MSC_REVIEW_PASSWORD:-}"
if [[ -z "$REVIEW_PASSWORD" ]]; then
  [[ -t 0 ]] || fail "Set MSC_REVIEW_PASSWORD when running non-interactively."
  IFS= read -r -s -p "Shared Cypress Ridge review password: " REVIEW_PASSWORD
  printf '\n'
fi
[[ -n "$REVIEW_PASSWORD" ]] || fail "The review password is required."

export E2E_MEMBER_EMAIL="${E2E_MEMBER_EMAIL:-member@cypressridge.test}"
export E2E_MEMBER_PASSWORD="${E2E_MEMBER_PASSWORD:-$REVIEW_PASSWORD}"
export E2E_SCHOOL_ADMIN_EMAIL="${E2E_SCHOOL_ADMIN_EMAIL:-school.admin@cypressridge.test}"
export E2E_SCHOOL_ADMIN_PASSWORD="${E2E_SCHOOL_ADMIN_PASSWORD:-$REVIEW_PASSWORD}"
export E2E_CLUB_ADMIN_EMAIL="${E2E_CLUB_ADMIN_EMAIL:-robotics.admin@cypressridge.test}"
export E2E_CLUB_ADMIN_PASSWORD="${E2E_CLUB_ADMIN_PASSWORD:-$REVIEW_PASSWORD}"
export E2E_APP_ADMIN_EMAIL="${E2E_APP_ADMIN_EMAIL:-app.admin@cypressridge.test}"
export E2E_APP_ADMIN_PASSWORD="${E2E_APP_ADMIN_PASSWORD:-$REVIEW_PASSWORD}"
export APP_ID

if [[ "$SEED_PRODUCTION" == "true" ]]; then
  log "Refreshing the guarded production App Review fixture."
  MSC_REVIEW_PASSWORD="$REVIEW_PASSWORD" "${SCRIPT_DIR}/seed-app-review-production.sh"
fi

log "Checking production endpoints."
for url in \
  https://myskoolclub.com/ \
  https://myskoolclub.com/support \
  https://myskoolclub.com/privacy \
  https://myskoolclub.com/terms \
  https://myskoolclub.com/community-standards \
  https://myskoolclub.com/api/health
do
  curl -fsS -L --max-time 20 -o /dev/null "$url" || fail "Endpoint check failed: ${url}"
done

if [[ "$RUN_TESTS" == "true" ]]; then
  log "Running the mobile Jest preflight."
  (cd "$MOBILE_DIR" && "$NPM_BIN" test -- --runInBand)
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"
[[ ! -e "$OUTPUT_FILE" ]] || fail "Output file already exists: ${OUTPUT_FILE}"

stop_recording() {
  local exit_code=$?
  trap - EXIT INT TERM
  if [[ -n "$RECORDING_PID" ]] && kill -0 "$RECORDING_PID" 2>/dev/null; then
    kill -INT "$RECORDING_PID" 2>/dev/null || true
    wait "$RECORDING_PID" 2>/dev/null || true
  fi
  unset REVIEW_PASSWORD MSC_REVIEW_PASSWORD E2E_MEMBER_PASSWORD \
    E2E_SCHOOL_ADMIN_PASSWORD E2E_CLUB_ADMIN_PASSWORD E2E_APP_ADMIN_PASSWORD
  exit "$exit_code"
}
trap stop_recording EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

log "Recording simulator ${SIMULATOR_UDID} to ${OUTPUT_FILE}."
xcrun simctl io "$SIMULATOR_UDID" recordVideo --codec=h264 "$OUTPUT_FILE" &
RECORDING_PID=$!

for role in public member school-admin club-admin app-admin; do
  log "Running ${role} rehearsal."
  "$REHEARSAL_RUNNER" "$role"
done

kill -INT "$RECORDING_PID" 2>/dev/null || true
wait "$RECORDING_PID" 2>/dev/null || true
RECORDING_PID=""

[[ -s "$OUTPUT_FILE" ]] || fail "The simulator recording was not created."
log "Rehearsal passed. Recording: ${OUTPUT_FILE}"
log "Do not submit this simulator video to Apple; record the final flow on an iPhone."