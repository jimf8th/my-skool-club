#!/usr/bin/env bash
# =============================================================================
# GCP project configuration — edit these values before running any script.
# =============================================================================

# Your GCP project ID. Leave unset to use the active gcloud project.
export GCP_PROJECT_ID="${GCP_PROJECT_ID:-}"
if [[ -z "$GCP_PROJECT_ID" ]] && command -v gcloud &>/dev/null; then
	ACTIVE_GCP_PROJECT="$(gcloud config get-value project 2>/dev/null)"
	if [[ -n "$ACTIVE_GCP_PROJECT" && "$ACTIVE_GCP_PROJECT" != "(unset)" ]]; then
		export GCP_PROJECT_ID="$ACTIVE_GCP_PROJECT"
	fi
	unset ACTIVE_GCP_PROJECT
fi

# Region for Cloud Run and Cloud SQL
export GCP_REGION="${GCP_REGION:-us-central1}"

# Cloud SQL
export CLOUD_SQL_INSTANCE_NAME="my-skool-club-db"
export CLOUD_SQL_EDITION="${CLOUD_SQL_EDITION:-enterprise}"
export CLOUD_SQL_TIER="${CLOUD_SQL_TIER:-db-f1-micro}" # smallest shared-core tier
export DB_NAME="myskoolclub"
export DB_USERNAME="myskoolclub_user"

# Private networking (required when public Cloud SQL IPs are blocked by policy)
export VPC_NETWORK_NAME="${VPC_NETWORK_NAME:-my-skool-club-vpc}"
export VPC_SUBNET_NAME="${VPC_SUBNET_NAME:-my-skool-club-run}"
export VPC_SUBNET_RANGE="${VPC_SUBNET_RANGE:-10.8.0.0/26}"
export PRIVATE_SERVICE_RANGE_NAME="${PRIVATE_SERVICE_RANGE_NAME:-my-skool-club-sql-range}"
export PRIVATE_SERVICE_PREFIX_LENGTH="${PRIVATE_SERVICE_PREFIX_LENGTH:-24}"

# Artifact Registry repository name
export AR_REPO="my-skool-club"

# Cloud Run service name
export SERVICE_NAME="${SERVICE_NAME:-my-skool-club-app}"
export MIGRATION_JOB_NAME="${MIGRATION_JOB_NAME:-${SERVICE_NAME}-db-migrate}"

# Service account for Cloud Run
export SA_NAME="my-skool-club-sa"

# Transactional email through authenticated Google Workspace/Gmail SMTP.
# Credentials are stored in Secret Manager, never in this file.
export MAIL_HOST="${MAIL_HOST:-smtp.gmail.com}"
export MAIL_PORT="${MAIL_PORT:-587}"
export MAIL_SMTP_AUTH="${MAIL_SMTP_AUTH:-true}"
export MAIL_STARTTLS="${MAIL_STARTTLS:-true}"
export MAIL_STARTTLS_REQUIRED="${MAIL_STARTTLS_REQUIRED:-true}"
export MAIL_FROM="${MAIL_FROM:-support@myskoolclub.com}"

# OpenAI receipt scanning. The API key is stored in Secret Manager; these are
# non-secret defaults passed to Cloud Run.
export OPENAI_MODEL="${OPENAI_MODEL:-gpt-4o-mini}"
export OPENAI_API_URL="${OPENAI_API_URL:-https://api.openai.com/v1/chat/completions}"

# ---- Derived values (no need to edit) ----
export IMAGE="${IMAGE:-${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID:-PROJECT-ID}/${AR_REPO}/myskoolclub}"
export PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://myskoolclub.com}"
export CLOUD_SQL_CONNECTION="${GCP_PROJECT_ID}:${GCP_REGION}:${CLOUD_SQL_INSTANCE_NAME}"
export SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
