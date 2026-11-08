#!/usr/bin/env bash
# Store SMTP credentials for an already-provisioned My Skool Club project.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/config.sh
source "${ROOT_DIR}/scripts/config.sh"

err() { echo "[email-setup] $*" >&2; exit 1; }

command -v gcloud &>/dev/null || err "gcloud CLI not found."
[[ -n "$GCP_PROJECT_ID" ]] || err "No GCP project configured."
read -r -p "  Enter Google Workspace email:           " MAIL_USERNAME
read -r -s -p "  Enter Google 16-character app password: " MAIL_PASSWORD
echo ""
MAIL_PASSWORD="${MAIL_PASSWORD// /}"
[[ -n "$MAIL_USERNAME" && -n "$MAIL_PASSWORD" ]] || \
    err "Google SMTP email and app password are required."

store_secret() {
    local name="$1"
    local value="$2"
    if gcloud secrets describe "$name" --project="$GCP_PROJECT_ID" &>/dev/null; then
        printf '%s' "$value" | gcloud secrets versions add "$name" \
            --project="$GCP_PROJECT_ID" --data-file=-
    else
        printf '%s' "$value" | gcloud secrets create "$name" \
            --project="$GCP_PROJECT_ID" --data-file=-
    fi
}

store_secret "mail-username" "$MAIL_USERNAME"
store_secret "mail-password" "$MAIL_PASSWORD"

echo "[email-setup] SMTP secrets stored. Deploy with the same MAIL_HOST and MAIL_FROM values."
