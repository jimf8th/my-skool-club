#!/usr/bin/env bash
# =============================================================================
# dev.sh — Start the full local development stack
#
# The frontend runs through Vite with hot reload and proxies /api requests to
# Spring Boot. Production builds bundle the frontend through Maven instead.
#
# Services started:
#   • PostgreSQL  (Docker, port 5432)
#   • MailHog     (Docker, SMTP 1025, inbox 8025)
#   • Spring Boot (port 8080) — serves /api/*
#   • Vite       (port 3000) — serves the React frontend with hot reload
#
# Usage:
#   ./scripts/dev.sh               # start Docker + API + frontend
#   ./scripts/dev.sh --api-only    # start Docker + API only (for mobile work)
#   ./scripts/dev.sh --no-frontend # alias for --api-only
#
# Ctrl+C stops all processes cleanly.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Load the local environment file so it configures Spring Boot as well as the
# frontend server. Docker Compose reads the same file automatically.
if [[ -f "$ROOT_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
    set +a
fi

# Force JDK 21 for the backend build/run regardless of the shell's JAVA_HOME.
# (An experimental/EA JDK such as a "-loom" build in JAVA_HOME can crash javac's
# annotation processing — e.g. Lombok — with ExceptionInInitializerError: TypeTag.)
if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    if JAVA21_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null); then
        export JAVA_HOME="$JAVA21_HOME"
        export PATH="$JAVA_HOME/bin:$PATH"
    fi
fi
# Fallback: use the well-known Temurin 21 path if java_home didn't set JDK 21
if [[ -z "$JAVA_HOME" || ! "$("$JAVA_HOME/bin/java" -version 2>&1)" =~ "21" ]]; then
    _TEMURIN21="/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home"
    if [[ -x "$_TEMURIN21/bin/java" ]]; then
        export JAVA_HOME="$_TEMURIN21"
        export PATH="$JAVA_HOME/bin:$PATH"
    fi
    unset _TEMURIN21
fi

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${CYAN}[dev]${NC} $*"; }
ok()   { echo -e "${GREEN}[dev]${NC} $*"; }
warn() { echo -e "${YELLOW}[dev]${NC} $*"; }
err()  { echo -e "${RED}[dev]${NC} $*" >&2; }

# Colorize Spring Boot logs by level
colorize_logs() {
    while IFS= read -r line; do
        if [[ "$line" =~ ERROR|FAILED|Exception|Error ]]; then
            echo -e "${RED}${line}${NC}"
        elif [[ "$line" =~ WARN|WARNING ]]; then
            echo -e "${YELLOW}${line}${NC}"
        elif [[ "$line" =~ INFO|Started.*Application ]]; then
            echo -e "${GREEN}${line}${NC}"
        elif [[ "$line" =~ DEBUG ]]; then
            echo -e "${CYAN}${line}${NC}"
        else
            echo "$line"
        fi
    done
}

# Kill all processes using a given port and wait until it is released
kill_port() {
    local port=$1
    local pids
    pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
        warn "Killing existing processes on port $port (PIDs: $(echo "$pids" | tr '\n' ' '))"
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
    # Wait up to 5 s for the port to be released
    for i in $(seq 1 10); do
        lsof -ti tcp:"$port" >/dev/null 2>&1 || break
        [[ $i -eq 10 ]] && { err "Port $port still in use after 5 s — giving up."; exit 1; }
        sleep 0.5
    done
}

BACKEND_PID=""
FRONTEND_PID=""
API_ONLY=false
_CLEANED_UP=false

usage() {
    sed -n '8,18p' "$0" | sed 's/^# \{0,1\}//'
}

for arg in "$@"; do
    case "$arg" in
        --api-only|--no-frontend) API_ONLY=true ;;
        --skip-frontend-build)
            warn "--skip-frontend-build is no longer needed; Vite now runs the frontend directly."
            ;;
        -h|--help) usage; exit 0 ;;
        *) err "Unknown argument: $arg"; usage; exit 1 ;;
    esac
done

cleanup() {
    $_CLEANED_UP && return
    _CLEANED_UP=true
    echo ""
    warn "Shutting down local application processes..."
    [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
    [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null || true
    sleep 1
    # NOTE: Docker containers (postgres, mailhog) are left running intentionally
    # so the next dev.sh invocation starts instantly without a postgres race condition.
    # To stop Docker: docker compose down
    ok "Frontend and Spring Boot stopped. (Docker containers still running — use 'docker compose down' to stop them)"
}
trap cleanup SIGINT SIGTERM EXIT

# ── 1. Docker services (PostgreSQL + local SMTP) ─────────────────────────────
log "Starting local PostgreSQL and MailHog in Docker..."
docker compose up -d postgres mailhog

log "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
    # First confirm the port is open from the host (Docker port mapping is up)
    if ! nc -z localhost 5432 2>/dev/null; then
        sleep 1; continue
    fi
    # Then confirm postgres is accepting authenticated connections
    if docker compose exec -T postgres pg_isready \
            -U "${POSTGRES_USER:-postgres}" \
            -d "${POSTGRES_DB:-myskoolclub_dev}" -q 2>/dev/null; then
        break
    fi
    [[ $i -eq 30 ]] && { err "PostgreSQL did not become ready in time."; exit 1; }
    sleep 1
done
ok "PostgreSQL is ready."

# ── 2. Backend ─────────────────────────────────────────────────────────────────────────────
kill_port 8080

log "Starting Spring Boot API (port 8080)..."
BACKEND_LOG="$ROOT_DIR/.dev-backend.log"
(cd backend && ./mvnw spring-boot:run \
    -Dspring-boot.run.profiles=dev \
    -Dmaven.test.skip=true \
    -Dfrontend.skip=true \
    2>&1 | tee "$BACKEND_LOG" | colorize_logs) &
BACKEND_PID=$!

log "Waiting for backend to be ready..."
for i in $(seq 1 60); do
    curl -sf http://localhost:8080/api/health >/dev/null 2>&1 && break
    # Check if the process died
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        err "Backend process exited unexpectedly. Check $BACKEND_LOG for details."
        exit 1
    fi
    [[ $i -eq 60 ]] && { err "Backend did not start within 60 seconds."; exit 1; }
    sleep 1
done
ok "Backend is ready."

# ── 3. Frontend development server ─────────────────────────────────────────────────
if $API_ONLY; then
    warn "API-only mode: not starting the web frontend."
else
    command -v npm >/dev/null 2>&1 || { err "npm is required to start the frontend."; exit 1; }

    if [[ ! -d frontend/node_modules ]]; then
        log "Installing frontend npm dependencies..."
        (cd frontend && npm install)
    fi

    kill_port 3000
    log "Starting Vite frontend (port 3000, hot reload enabled)..."
    FRONTEND_LOG="$ROOT_DIR/.dev-frontend.log"
    (cd frontend && npm run dev -- --host 0.0.0.0 2>&1 | tee "$FRONTEND_LOG") &
    FRONTEND_PID=$!

    log "Waiting for frontend to be ready..."
    for i in $(seq 1 30); do
        curl -sf http://localhost:3000 >/dev/null 2>&1 && break
        if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
            err "Frontend process exited unexpectedly. Check $FRONTEND_LOG for details."
            exit 1
        fi
        [[ $i -eq 30 ]] && { err "Frontend did not start within 30 seconds."; exit 1; }
        sleep 1
    done
    ok "Frontend is ready."
fi

# ── Ready ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}  ✓ Dev stack is running${NC}"
echo ""
if $API_ONLY; then
    echo -e "  ${GREEN}Local API     ${NC} → http://localhost:8080/api"
else
    echo -e "  ${GREEN}Frontend      ${NC} → http://localhost:3000"
    echo -e "  ${GREEN}Local API     ${NC} → http://localhost:8080/api"
fi
echo -e "  ${GREEN}Health        ${NC} → http://localhost:8080/api/health"
if [[ "${EMAIL_VERIFICATION_ENABLED:-false}" == "true" ]]; then
    echo -e "  ${GREEN}Email inbox   ${NC} → http://localhost:8025"
else
    echo -e "  ${GREEN}Email verify  ${NC} → disabled (set EMAIL_VERIFICATION_ENABLED=true to test with MailHog)"
fi
echo ""
echo -e "  Backend logs: ${CYAN}.dev-backend.log${NC}"
if ! $API_ONLY; then
    echo -e "  Frontend logs: ${CYAN}.dev-frontend.log${NC}"
fi
if $API_ONLY; then
    echo -e "  Mobile: in another terminal run ${YELLOW}cd mobile && npm run start:dev${NC}"
else
    echo -e "  Frontend changes reload automatically in the browser."
fi
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop everything."
echo ""

if $API_ONLY; then
    wait "$BACKEND_PID" || true
else
    while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
        sleep 1
    done

    if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
        err "Frontend stopped unexpectedly. Check $FRONTEND_LOG for details."
        exit 1
    fi
    warn "Backend stopped. Check $BACKEND_LOG for details."
fi
