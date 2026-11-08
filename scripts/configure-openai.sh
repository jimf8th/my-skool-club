#!/usr/bin/env bash
# Store or rotate the OpenAI API key for an already-provisioned project.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/config.sh
source "${ROOT_DIR}/scripts/config.sh"

err() { echo "[openai-setup] $*" >&2; exit 1; }

command -v gcloud &>/dev/null || err "gcloud CLI not found."
[[ -n "$GCP_PROJECT_ID" ]] || err "No GCP project configured."

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    read -r -s -p "  Enter OpenAI API key: " OPENAI_API_KEY
    echo ""
fi
[[ -n "$OPENAI_API_KEY" ]] || err "An OpenAI API key is required."

if gcloud secrets describe openai-api-key --project="$GCP_PROJECT_ID" &>/dev/null; then
    printf '%s' "$OPENAI_API_KEY" | gcloud secrets versions add openai-api-key \
        --project="$GCP_PROJECT_ID" --data-file=-
else
    printf '%s' "$OPENAI_API_KEY" | gcloud secrets create openai-api-key \
        --project="$GCP_PROJECT_ID" --data-file=-
fi

echo "[openai-setup] OpenAI API key stored. Deploy to enable receipt scanning."
