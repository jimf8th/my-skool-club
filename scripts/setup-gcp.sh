#!/usr/bin/env bash
# =============================================================================
# setup-gcp.sh — Idempotent GCP infrastructure provisioning
#
# Called automatically by deploy.sh. It detects existing resources and creates
# only what is missing. Existing secrets and database credentials are never
# rotated.
#
# What it provisions:
#   1. Enables required GCP APIs
#   2. Creates an Artifact Registry Docker repository
#   3. Creates a VPC, Cloud Run subnet, and private services access
#   4. Creates a private-IP Cloud SQL PostgreSQL instance + database + user
#   5. Stores DB, JWT, SMTP, and OpenAI credentials in Secret Manager
#   6. Creates a least-privilege service account for Cloud Run
#
# Prerequisites:
#   - gcloud CLI authenticated as a project owner: gcloud auth login
#   - Edit scripts/config.sh with your project values
#   - On a first deployment, have the DB password, JWT secret, SMTP credentials,
#     and OpenAI API key ready. Only missing values are requested.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/config.sh
source "${ROOT_DIR}/scripts/config.sh"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

log()  { echo -e "${CYAN}[setup]${NC} $*"; }
ok()   { echo -e "${GREEN}[setup]${NC} ✓ $*"; }
warn() { echo -e "${YELLOW}[setup]${NC} $*"; }
err()  { echo -e "${RED}[setup]${NC} $*" >&2; exit 1; }
step() { echo ""; echo -e "${YELLOW}━━━ $* ━━━${NC}"; }

# ---- Validate prerequisites ----
command -v gcloud &>/dev/null || err "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"

if [[ -z "$GCP_PROJECT_ID" ]]; then
    err "No GCP project configured. Run: gcloud config set project PROJECT_ID"
fi

gcloud config set project "$GCP_PROJECT_ID" --quiet

secret_has_enabled_version() {
    local name="$1"
    local version=""
    if gcloud secrets describe "$name" --project="$GCP_PROJECT_ID" &>/dev/null; then
        version="$(gcloud secrets versions list "$name" \
            --project="$GCP_PROJECT_ID" \
            --filter='state=ENABLED' \
            --limit=1 \
            --format='value(name)')"
    fi
    [[ -n "$version" ]]
}

store_missing_secret() {
    local name="$1"
    local value="$2"
    if gcloud secrets describe "$name" --project="$GCP_PROJECT_ID" &>/dev/null; then
        printf '%s' "$value" | gcloud secrets versions add "$name" \
            --project="$GCP_PROJECT_ID" --data-file=-
    else
        printf '%s' "$value" | gcloud secrets create "$name" \
            --project="$GCP_PROJECT_ID" --data-file=-
    fi
    ok "Secret '${name}' created."
}

require_interactive_secret() {
    local label="$1"
    [[ -t 0 ]] || err "${label} is missing. Run deploy.sh interactively or provide it as an environment variable."
}

# ---- 1. Enable APIs ----
step "Enabling GCP APIs"
APIS=(
    run.googleapis.com
    sqladmin.googleapis.com
    secretmanager.googleapis.com
    artifactregistry.googleapis.com
    cloudbuild.googleapis.com
    iam.googleapis.com
    compute.googleapis.com
    servicenetworking.googleapis.com
)
ENABLED_APIS="$(gcloud services list --enabled \
    --project="$GCP_PROJECT_ID" \
    --format='value(config.name)')"
for api in "${APIS[@]}"; do
    if grep -qx "$api" <<< "$ENABLED_APIS"; then
        warn "API '${api}' is already enabled — skipping."
    else
        log "Enabling ${api}..."
        gcloud services enable "$api" --project="$GCP_PROJECT_ID" --quiet
    fi
done
unset ENABLED_APIS
ok "Required APIs are enabled."

# ---- 2. Artifact Registry ----
step "Setting up Artifact Registry"
if gcloud artifacts repositories describe "$AR_REPO" \
        --project="$GCP_PROJECT_ID" --location="$GCP_REGION" &>/dev/null; then
    warn "Artifact Registry repo '${AR_REPO}' already exists — skipping."
else
    log "Creating Artifact Registry repo '${AR_REPO}'..."
    gcloud artifacts repositories create "$AR_REPO" \
        --repository-format=docker \
        --location="$GCP_REGION" \
        --project="$GCP_PROJECT_ID" \
        --description="Docker images for My Skool Club"
    ok "Artifact Registry repo created."
fi

log "Configuring Docker auth for Artifact Registry..."
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet
ok "Docker auth configured."

# ---- 3. Private networking ----
step "Provisioning private networking"

if gcloud compute networks describe "$VPC_NETWORK_NAME" \
        --project="$GCP_PROJECT_ID" &>/dev/null; then
    warn "VPC network '${VPC_NETWORK_NAME}' already exists — skipping creation."
else
    log "Creating custom VPC network '${VPC_NETWORK_NAME}'..."
    gcloud compute networks create "$VPC_NETWORK_NAME" \
        --project="$GCP_PROJECT_ID" \
        --subnet-mode=custom \
        --bgp-routing-mode=regional
    ok "VPC network created."
fi

if gcloud compute networks subnets describe "$VPC_SUBNET_NAME" \
        --project="$GCP_PROJECT_ID" --region="$GCP_REGION" &>/dev/null; then
    warn "VPC subnet '${VPC_SUBNET_NAME}' already exists — skipping creation."
else
    log "Creating Cloud Run subnet '${VPC_SUBNET_NAME}' (${VPC_SUBNET_RANGE})..."
    gcloud compute networks subnets create "$VPC_SUBNET_NAME" \
        --project="$GCP_PROJECT_ID" \
        --network="$VPC_NETWORK_NAME" \
        --region="$GCP_REGION" \
        --range="$VPC_SUBNET_RANGE" \
        --enable-private-ip-google-access
    ok "Cloud Run subnet created."
fi

if gcloud compute addresses describe "$PRIVATE_SERVICE_RANGE_NAME" \
        --project="$GCP_PROJECT_ID" --global &>/dev/null; then
    warn "Private services range '${PRIVATE_SERVICE_RANGE_NAME}' already exists — skipping allocation."
else
    log "Allocating /${PRIVATE_SERVICE_PREFIX_LENGTH} range for private Google services..."
    gcloud compute addresses create "$PRIVATE_SERVICE_RANGE_NAME" \
        --project="$GCP_PROJECT_ID" \
        --global \
        --purpose=VPC_PEERING \
        --prefix-length="$PRIVATE_SERVICE_PREFIX_LENGTH" \
        --network="$VPC_NETWORK_NAME"
    ok "Private services range allocated."
fi

PEERING_NAME="$(gcloud services vpc-peerings list \
    --project="$GCP_PROJECT_ID" \
    --network="$VPC_NETWORK_NAME" \
    --service=servicenetworking.googleapis.com \
    --format='value(peering)')"
if [[ -n "$PEERING_NAME" ]]; then
    warn "Private services access is already connected — skipping peering."
else
    log "Connecting the VPC to Google private services..."
    gcloud services vpc-peerings connect \
        --project="$GCP_PROJECT_ID" \
        --network="$VPC_NETWORK_NAME" \
        --service=servicenetworking.googleapis.com \
        --ranges="$PRIVATE_SERVICE_RANGE_NAME" \
        --quiet
    ok "Private services access connected."
fi

# ---- 4. Cloud SQL ----
step "Provisioning private-IP Cloud SQL (PostgreSQL)"

if gcloud sql instances describe "$CLOUD_SQL_INSTANCE_NAME" \
        --project="$GCP_PROJECT_ID" &>/dev/null; then
    warn "Cloud SQL instance '${CLOUD_SQL_INSTANCE_NAME}' already exists — skipping creation."
else
    log "Creating Cloud SQL instance '${CLOUD_SQL_INSTANCE_NAME}' (this takes ~5 minutes)..."
    gcloud sql instances create "$CLOUD_SQL_INSTANCE_NAME" \
        --project="$GCP_PROJECT_ID" \
        --database-version=POSTGRES_16 \
        --edition="$CLOUD_SQL_EDITION" \
        --tier="$CLOUD_SQL_TIER" \
        --region="$GCP_REGION" \
        --network="$VPC_NETWORK_NAME" \
        --no-assign-ip \
        --storage-auto-increase \
        --storage-size=10GB \
        --backup-start-time=03:00 \
        --deletion-protection
    ok "Cloud SQL instance created."
fi

if gcloud sql databases describe "$DB_NAME" \
        --instance="$CLOUD_SQL_INSTANCE_NAME" \
        --project="$GCP_PROJECT_ID" &>/dev/null; then
    warn "Database '${DB_NAME}' already exists — skipping creation."
else
    log "Creating database '${DB_NAME}'..."
    gcloud sql databases create "$DB_NAME" \
        --instance="$CLOUD_SQL_INSTANCE_NAME" \
        --project="$GCP_PROJECT_ID"
    ok "Database created."
fi

# ---- 5. Secret Manager and database user ----
step "Checking application secrets"

if secret_has_enabled_version "db-username"; then
    warn "Secret 'db-username' already has an enabled version — skipping."
else
    store_missing_secret "db-username" "$DB_USERNAME"
fi

DB_PASSWORD_CREATED=false
DB_PASSWORD_VALUE="${DB_PASSWORD:-}"
if secret_has_enabled_version "db-password"; then
    warn "Secret 'db-password' already has an enabled version — skipping."
else
    if [[ -z "$DB_PASSWORD_VALUE" ]]; then
        require_interactive_secret "Database password secret"
        read -r -s -p "  Enter DB password for '${DB_USERNAME}': " DB_PASSWORD_VALUE
        echo ""
    fi
    [[ -n "$DB_PASSWORD_VALUE" ]] || err "Database password cannot be empty."
    store_missing_secret "db-password" "$DB_PASSWORD_VALUE"
    DB_PASSWORD_CREATED=true
fi

if secret_has_enabled_version "jwt-secret"; then
    warn "Secret 'jwt-secret' already has an enabled version — skipping."
else
    JWT_SECRET_VALUE="${JWT_SECRET:-}"
    if [[ -z "$JWT_SECRET_VALUE" ]]; then
        require_interactive_secret "JWT secret"
        read -r -s -p "  Enter JWT secret (min 32 chars): " JWT_SECRET_VALUE
        echo ""
    fi
    [[ ${#JWT_SECRET_VALUE} -ge 32 ]] || err "JWT secret must be at least 32 characters."
    store_missing_secret "jwt-secret" "$JWT_SECRET_VALUE"
    unset JWT_SECRET_VALUE
fi

if secret_has_enabled_version "mail-username"; then
    warn "Secret 'mail-username' already has an enabled version — skipping."
else
    MAIL_USERNAME_VALUE="${MAIL_USERNAME:-}"
    if [[ -z "$MAIL_USERNAME_VALUE" ]]; then
        require_interactive_secret "SMTP username secret"
        read -r -p "  Enter Google Workspace email: " MAIL_USERNAME_VALUE
    fi
    [[ -n "$MAIL_USERNAME_VALUE" ]] || err "SMTP username cannot be empty."
    store_missing_secret "mail-username" "$MAIL_USERNAME_VALUE"
    unset MAIL_USERNAME_VALUE
fi

if secret_has_enabled_version "mail-password"; then
    warn "Secret 'mail-password' already has an enabled version — skipping."
else
    MAIL_PASSWORD_VALUE="${MAIL_PASSWORD:-}"
    if [[ -z "$MAIL_PASSWORD_VALUE" ]]; then
        require_interactive_secret "SMTP password secret"
        read -r -s -p "  Enter Google 16-character app password: " MAIL_PASSWORD_VALUE
        echo ""
    fi
    MAIL_PASSWORD_VALUE="${MAIL_PASSWORD_VALUE// /}"
    [[ -n "$MAIL_PASSWORD_VALUE" ]] || err "SMTP password cannot be empty."
    store_missing_secret "mail-password" "$MAIL_PASSWORD_VALUE"
    unset MAIL_PASSWORD_VALUE
fi

if secret_has_enabled_version "openai-api-key"; then
    warn "Secret 'openai-api-key' already has an enabled version — skipping."
else
    OPENAI_API_KEY_VALUE="${OPENAI_API_KEY:-}"
    if [[ -z "$OPENAI_API_KEY_VALUE" ]]; then
        require_interactive_secret "OpenAI API key secret"
        read -r -s -p "  Enter OpenAI API key: " OPENAI_API_KEY_VALUE
        echo ""
    fi
    [[ -n "$OPENAI_API_KEY_VALUE" ]] || err "OpenAI API key cannot be empty."
    store_missing_secret "openai-api-key" "$OPENAI_API_KEY_VALUE"
    unset OPENAI_API_KEY_VALUE
fi

if ! CLOUD_SQL_USERS="$(gcloud sql users list \
        --instance="$CLOUD_SQL_INSTANCE_NAME" \
        --project="$GCP_PROJECT_ID" \
        --format='value(name)')"; then
    err "Could not inspect database users for '${CLOUD_SQL_INSTANCE_NAME}'."
fi

if grep -qx "$DB_USERNAME" <<< "$CLOUD_SQL_USERS"; then
    if $DB_PASSWORD_CREATED; then
        log "Synchronizing the existing database user with the newly created password secret..."
        gcloud sql users set-password "$DB_USERNAME" \
            --instance="$CLOUD_SQL_INSTANCE_NAME" \
            --project="$GCP_PROJECT_ID" \
            --password="$DB_PASSWORD_VALUE"
        ok "Database user password synchronized."
    else
        warn "Database user '${DB_USERNAME}' already exists — skipping."
    fi
else
    if [[ -z "$DB_PASSWORD_VALUE" ]]; then
        DB_PASSWORD_VALUE="$(gcloud secrets versions access latest \
            --secret=db-password \
            --project="$GCP_PROJECT_ID")" || \
            err "Could not read db-password to create database user '${DB_USERNAME}'."
    fi
    log "Creating database user '${DB_USERNAME}'..."
    gcloud sql users create "$DB_USERNAME" \
        --instance="$CLOUD_SQL_INSTANCE_NAME" \
        --project="$GCP_PROJECT_ID" \
        --password="$DB_PASSWORD_VALUE"
    ok "Database user created."
fi
unset CLOUD_SQL_USERS DB_PASSWORD_CREATED DB_PASSWORD_VALUE

# ---- 6. Service Account ----
step "Creating Cloud Run service account"

if gcloud iam service-accounts describe "$SA_EMAIL" \
        --project="$GCP_PROJECT_ID" &>/dev/null; then
    warn "Service account '${SA_EMAIL}' already exists — skipping creation."
else
    log "Creating service account '${SA_NAME}'..."
    gcloud iam service-accounts create "$SA_NAME" \
        --project="$GCP_PROJECT_ID" \
        --display-name="My Skool Club — Cloud Run"
    ok "Service account created."
fi

grant_project_role() {
    local role="$1"
    local label="$2"
    local attempt=1
    local max_attempts=12
    local existing_binding=""

    existing_binding="$(gcloud projects get-iam-policy "$GCP_PROJECT_ID" \
        --flatten='bindings[].members' \
        --filter="bindings.role=${role} AND bindings.members=serviceAccount:${SA_EMAIL}" \
        --format='value(bindings.role)')"
    if [[ -n "$existing_binding" ]]; then
        warn "${label} role is already granted — skipping."
        return 0
    fi

    log "Granting ${label} role..."
    while [[ "$attempt" -le "$max_attempts" ]]; do
        if [[ "$attempt" -eq "$max_attempts" ]]; then
            gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
                --member="serviceAccount:${SA_EMAIL}" \
                --role="$role" \
                --condition=None \
                --quiet || err "Could not grant '${role}' to '${SA_EMAIL}'."
            return 0
        fi

        if gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
                --member="serviceAccount:${SA_EMAIL}" \
                --role="$role" \
                --condition=None \
                --quiet &>/dev/null; then
            return 0
        fi

        warn "IAM has not recognized the new service account yet; retrying in 5 seconds (${attempt}/${max_attempts})..."
        sleep 5
        attempt=$((attempt + 1))
    done
}

grant_project_role "roles/cloudsql.client" "Cloud SQL client"
grant_project_role "roles/secretmanager.secretAccessor" "Secret Manager accessor"
ok "IAM permissions granted."

# ---- Done ----
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  GCP infrastructure is ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Cloud SQL connection : ${CLOUD_SQL_CONNECTION}"
echo "  Cloud SQL size       : ${CLOUD_SQL_EDITION} / ${CLOUD_SQL_TIER}"
echo "  Private VPC          : ${VPC_NETWORK_NAME} / ${VPC_SUBNET_NAME}"
echo "  Artifact Registry    : ${IMAGE}"
echo "  Service account      : ${SA_EMAIL}"
echo ""
