#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Build Docker image, push to Artifact Registry, deploy to Cloud Run
#
# Prerequisites:
#   - gcloud CLI authenticated: gcloud auth login
#   - Docker installed and running
#   - Edit scripts/config.sh with your project values
#
# Usage:
#   ./scripts/deploy.sh              # build, push, deploy (latest tag)
#   ./scripts/deploy.sh --tag v1.2.3 # build, push, deploy with a specific tag
#   ./scripts/deploy.sh --skip-build # push + deploy only (image must already be built)
#
# Missing GCP resources are detected and provisioned automatically.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/config.sh
source "${ROOT_DIR}/scripts/config.sh"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

log()  { echo -e "${CYAN}[deploy]${NC} $*"; }
ok()   { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err()  { echo -e "${RED}[deploy]${NC} $*" >&2; exit 1; }

# ---- Parse arguments ----
TAG="latest"
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)       TAG="$2"; shift 2 ;;
        --skip-build) SKIP_BUILD=true; shift ;;
        *) err "Unknown argument: $1" ;;
    esac
done

# ---- Validate prerequisites ----
command -v gcloud &>/dev/null || err "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
command -v docker &>/dev/null || err "Docker not found."
command -v curl &>/dev/null || err "curl not found."
command -v unzip &>/dev/null || err "unzip not found; it is required to verify the frontend in the deployment image."

[[ -f "${ROOT_DIR}/frontend/package.json" ]] || err "Frontend package manifest not found."
[[ -f "${ROOT_DIR}/frontend/package-lock.json" ]] || err "Frontend lockfile not found."
[[ -f "${ROOT_DIR}/frontend/index.html" ]] || err "Frontend entry point not found."

if [[ -z "$GCP_PROJECT_ID" ]]; then
    GCP_PROJECT_ID="$(gcloud config get-value project 2>/dev/null)"
    [[ -n "$GCP_PROJECT_ID" && "$GCP_PROJECT_ID" != "(unset)" ]] || \
        err "No GCP project configured. Run: gcloud config set project PROJECT_ID"
    export GCP_PROJECT_ID
fi

# Recompute values that depend on the active project when config.sh initially
# had no project ID available.
export CLOUD_SQL_CONNECTION="${GCP_PROJECT_ID}:${GCP_REGION}:${CLOUD_SQL_INSTANCE_NAME}"
export SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
if [[ "$IMAGE" == *"/PROJECT-ID/"* ]]; then
    export IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO}/myskoolclub"
fi
IMAGE_TAG="${IMAGE}:${TAG}"

log "Checking GCP infrastructure and provisioning anything missing..."
"${ROOT_DIR}/scripts/setup-gcp.sh"
ok "Required GCP infrastructure is available."

# ---- Validate Cloud SQL infrastructure and schema manifest ----
SCHEMA_MANIFEST="${ROOT_DIR}/backend/src/main/resources/db/schema-manifest.txt"
[[ -f "$SCHEMA_MANIFEST" ]] || err "Database schema manifest is missing: ${SCHEMA_MANIFEST}"

SCHEMA_TABLES="$(awk '!/^#/ && NF { print }' "$SCHEMA_MANIFEST" | paste -sd ',' -)"
SCHEMA_TABLE_COUNT="$(awk '!/^#/ && NF { count++ } END { print count + 0 }' "$SCHEMA_MANIFEST")"
[[ "$SCHEMA_TABLE_COUNT" -gt 0 ]] || err "Database schema manifest contains no tables."
log "Required PostgreSQL schema (${SCHEMA_TABLE_COUNT} tables): ${SCHEMA_TABLES}"

log "Checking Cloud SQL PostgreSQL infrastructure..."
if ! INSTANCE_VERSION="$(gcloud sql instances describe "$CLOUD_SQL_INSTANCE_NAME" \
        --project="$GCP_PROJECT_ID" --format='value(databaseVersion)')"; then
    err "Automatic provisioning did not create Cloud SQL instance '${CLOUD_SQL_INSTANCE_NAME}'."
fi
[[ "$INSTANCE_VERSION" == POSTGRES_* ]] || \
    err "Cloud SQL instance must use PostgreSQL; found '${INSTANCE_VERSION}'."

INSTANCE_STATE="$(gcloud sql instances describe "$CLOUD_SQL_INSTANCE_NAME" \
    --project="$GCP_PROJECT_ID" --format='value(state)')"
[[ "$INSTANCE_STATE" == "RUNNABLE" ]] || \
    err "Cloud SQL instance is not ready (state: ${INSTANCE_STATE})."

INSTANCE_REGION="$(gcloud sql instances describe "$CLOUD_SQL_INSTANCE_NAME" \
    --project="$GCP_PROJECT_ID" --format='value(region)')"
[[ "$INSTANCE_REGION" == "$GCP_REGION" ]] || \
    err "Cloud SQL is in '${INSTANCE_REGION}', but deployment region is '${GCP_REGION}'."

INSTANCE_PUBLIC_IP_ENABLED="$(gcloud sql instances describe "$CLOUD_SQL_INSTANCE_NAME" \
    --project="$GCP_PROJECT_ID" --format='value(settings.ipConfiguration.ipv4Enabled)')"
[[ "$INSTANCE_PUBLIC_IP_ENABLED" != "True" && "$INSTANCE_PUBLIC_IP_ENABLED" != "true" ]] || \
    err "Cloud SQL has a public IP enabled, which violates the required private-only configuration."

INSTANCE_PRIVATE_NETWORK="$(gcloud sql instances describe "$CLOUD_SQL_INSTANCE_NAME" \
    --project="$GCP_PROJECT_ID" --format='value(settings.ipConfiguration.privateNetwork)')"
[[ "$INSTANCE_PRIVATE_NETWORK" == */networks/"$VPC_NETWORK_NAME" ]] || \
    err "Cloud SQL is not attached to the expected VPC '${VPC_NETWORK_NAME}'."

gcloud compute networks describe "$VPC_NETWORK_NAME" \
    --project="$GCP_PROJECT_ID" &>/dev/null || \
    err "Automatic provisioning did not create VPC network '${VPC_NETWORK_NAME}'."

gcloud compute networks subnets describe "$VPC_SUBNET_NAME" \
    --project="$GCP_PROJECT_ID" \
    --region="$GCP_REGION" &>/dev/null || \
    err "Automatic provisioning did not create Cloud Run subnet '${VPC_SUBNET_NAME}'."

INSTANCE_EDITION="$(gcloud sql instances describe "$CLOUD_SQL_INSTANCE_NAME" \
    --project="$GCP_PROJECT_ID" --format='value(settings.edition)')"
INSTANCE_TIER="$(gcloud sql instances describe "$CLOUD_SQL_INSTANCE_NAME" \
    --project="$GCP_PROJECT_ID" --format='value(settings.tier)')"
INSTANCE_EDITION_NORMALIZED="$(echo "$INSTANCE_EDITION" | tr '[:upper:]' '[:lower:]')"
CONFIGURED_EDITION_NORMALIZED="$(echo "$CLOUD_SQL_EDITION" | tr '[:upper:]' '[:lower:]')"
if [[ "$INSTANCE_EDITION_NORMALIZED" != "$CONFIGURED_EDITION_NORMALIZED" || "$INSTANCE_TIER" != "$CLOUD_SQL_TIER" ]]; then
    warn "Cloud SQL uses ${INSTANCE_EDITION}/${INSTANCE_TIER}; configured size is ${CLOUD_SQL_EDITION}/${CLOUD_SQL_TIER}."
fi

gcloud sql databases describe "$DB_NAME" \
    --instance="$CLOUD_SQL_INSTANCE_NAME" \
    --project="$GCP_PROJECT_ID" &>/dev/null || \
    err "Automatic provisioning did not create database '${DB_NAME}'."

gcloud iam service-accounts describe "$SA_EMAIL" \
    --project="$GCP_PROJECT_ID" &>/dev/null || \
    err "Automatic provisioning did not create service account '${SA_EMAIL}'."

for secret in db-username db-password mail-username mail-password openai-api-key; do
    if ! ENABLED_VERSION="$(gcloud secrets versions list "$secret" \
            --project="$GCP_PROJECT_ID" \
            --filter='state=ENABLED' \
            --limit=1 \
            --format='value(name)')"; then
        err "Automatic provisioning did not create secret '${secret}'."
    fi
    [[ -n "$ENABLED_VERSION" ]] || \
        err "Secret '${secret}' has no enabled version after automatic provisioning."
done

if [[ "$IMAGE" == *"-docker.pkg.dev/"* ]]; then
    gcloud artifacts repositories describe "$AR_REPO" \
        --project="$GCP_PROJECT_ID" \
        --location="$GCP_REGION" &>/dev/null || \
        err "Automatic provisioning did not create Artifact Registry repository '${AR_REPO}'."
fi
ok "Cloud SQL PostgreSQL infrastructure is ready (${INSTANCE_VERSION}, ${INSTANCE_EDITION}/${INSTANCE_TIER})."

# ---- Build Docker image ----
if [[ "$SKIP_BUILD" == false ]]; then
    log "Building Docker image with the React frontend and Spring Boot API: ${IMAGE_TAG} ..."
    cd "$ROOT_DIR"
    docker build --platform linux/amd64 -t "$IMAGE_TAG" .
    ok "Image built."
fi

# Maven compiles Vite inside Docker and embeds its output in the Spring Boot
# JAR. Refuse to push an image that is missing the SPA or its asset bundle.
log "Verifying compiled frontend assets in ${IMAGE_TAG}..."
VERIFY_CONTAINER_ID="$(docker create "$IMAGE_TAG")"
VERIFY_DIR="$(mktemp -d)"
VERIFY_JAR="${VERIFY_DIR}/app.jar"
if ! docker cp "${VERIFY_CONTAINER_ID}:/app/app.jar" "$VERIFY_JAR"; then
    docker rm -f "$VERIFY_CONTAINER_ID" >/dev/null 2>&1 || true
    err "Could not inspect the application JAR in ${IMAGE_TAG}."
fi
docker rm "$VERIFY_CONTAINER_ID" >/dev/null

JAR_CONTENTS="$(unzip -Z1 "$VERIFY_JAR")"
if ! grep -qx 'BOOT-INF/classes/static/index.html' <<< "$JAR_CONTENTS"; then
    rm -f "$VERIFY_JAR"
    rmdir "$VERIFY_DIR" 2>/dev/null || true
    err "The deployment image does not contain the frontend index.html."
fi
if ! grep -q '^BOOT-INF/classes/static/assets/[^/].*' <<< "$JAR_CONTENTS"; then
    rm -f "$VERIFY_JAR"
    rmdir "$VERIFY_DIR" 2>/dev/null || true
    err "The deployment image does not contain compiled frontend assets."
fi
rm -f "$VERIFY_JAR"
rmdir "$VERIFY_DIR"
unset JAR_CONTENTS VERIFY_CONTAINER_ID VERIFY_DIR VERIFY_JAR
ok "Compiled frontend is bundled in the deployment image."

# ---- Push to Artifact Registry ----
log "Pushing image to Artifact Registry..."
docker push "$IMAGE_TAG"
ok "Image pushed."

# ---- Apply and verify PostgreSQL migrations ----
log "Deploying Cloud Run database migration job..."
gcloud run jobs deploy "$MIGRATION_JOB_NAME" \
    --project="$GCP_PROJECT_ID" \
    --region="$GCP_REGION" \
    --image="$IMAGE_TAG" \
    --service-account="$SA_EMAIL" \
    --set-cloudsql-instances="$CLOUD_SQL_CONNECTION" \
    --network="$VPC_NETWORK_NAME" \
    --subnet="$VPC_SUBNET_NAME" \
    --vpc-egress=private-ranges-only \
    --set-env-vars="SPRING_PROFILES_ACTIVE=prod,CLOUD_SQL_INSTANCE=${CLOUD_SQL_CONNECTION},DB_NAME=${DB_NAME},DB_MAX_POOL_SIZE=2" \
    --set-secrets="DB_USERNAME=db-username:latest,DB_PASSWORD=db-password:latest" \
    --args="--spring.main.web-application-type=none,--app.database.migration-only=true" \
    --tasks=1 \
    --max-retries=0 \
    --task-timeout=10m \
    --memory=1Gi \
    --cpu=1 \
    --quiet

log "Applying Flyway migrations and validating the PostgreSQL table manifest..."
gcloud run jobs execute "$MIGRATION_JOB_NAME" \
    --project="$GCP_PROJECT_ID" \
    --region="$GCP_REGION" \
    --wait \
    --quiet
ok "Flyway migrations completed and all ${SCHEMA_TABLE_COUNT} application tables were verified."

# ---- Deploy to Cloud Run ----
log "Deploying to Cloud Run (${GCP_REGION})..."

gcloud run deploy "$SERVICE_NAME" \
    --project="$GCP_PROJECT_ID" \
    --region="$GCP_REGION" \
    --image="$IMAGE_TAG" \
    --platform=managed \
    --service-account="$SA_EMAIL" \
    --set-cloudsql-instances="$CLOUD_SQL_CONNECTION" \
    --network="$VPC_NETWORK_NAME" \
    --subnet="$VPC_SUBNET_NAME" \
    --vpc-egress=private-ranges-only \
    --set-env-vars="SPRING_PROFILES_ACTIVE=prod,EMAIL_VERIFICATION_ENABLED=true,CLOUD_SQL_INSTANCE=${CLOUD_SQL_CONNECTION},DB_NAME=${DB_NAME},DB_MAX_POOL_SIZE=5,FRONTEND_URL=${PUBLIC_BASE_URL},MAIL_HOST=${MAIL_HOST},MAIL_PORT=${MAIL_PORT},MAIL_SMTP_AUTH=${MAIL_SMTP_AUTH},MAIL_STARTTLS=${MAIL_STARTTLS},MAIL_STARTTLS_REQUIRED=${MAIL_STARTTLS_REQUIRED},MAIL_FROM=${MAIL_FROM},OPENAI_MODEL=${OPENAI_MODEL},OPENAI_API_URL=${OPENAI_API_URL},FIREBASE_PROJECT_ID=my-skool-club-web" \
    --set-secrets="DB_USERNAME=db-username:latest,DB_PASSWORD=db-password:latest,MAIL_USERNAME=mail-username:latest,MAIL_PASSWORD=mail-password:latest,OPENAI_API_KEY=openai-api-key:latest" \
    --no-invoker-iam-check \
    --execution-environment=gen2 \
    --port=8080 \
    --memory=1Gi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --concurrency=100 \
    --timeout=300

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --project="$GCP_PROJECT_ID" \
    --region="$GCP_REGION" \
    --format="value(status.url)")

ok "Deployment complete."
echo ""
echo -e "  ${GREEN}Service URL${NC} → ${SERVICE_URL}"
echo -e "  ${GREEN}Health check${NC} → ${SERVICE_URL}/api/health"
echo ""

verify_frontend() {
    local base_url="$1"
    local page
    page="$(curl --fail --silent --show-error --retry 6 --retry-delay 5 "${base_url}/")" || \
        err "The frontend homepage is not reachable at ${base_url}/."
    grep -q 'id="root"' <<< "$page" || \
        err "${base_url}/ responded, but it did not return the React frontend."
    ok "React frontend is reachable at ${base_url}/."
}

log "Verifying public endpoints..."
verify_frontend "$SERVICE_URL"
for path in api/health privacy terms support community-standards; do
    if curl --fail --silent --show-error --retry 6 --retry-delay 5 \
        --output /dev/null "${SERVICE_URL}/${path}"; then
        ok "/${path} is reachable."
    else
        err "Deployment succeeded, but ${SERVICE_URL}/${path} is not reachable."
    fi
done

verify_frontend "$PUBLIC_BASE_URL"
for path in api/health privacy terms support community-standards; do
    if curl --fail --silent --show-error --retry 6 --retry-delay 5 \
        --output /dev/null "${PUBLIC_BASE_URL}/${path}"; then
        ok "${PUBLIC_BASE_URL}/${path} is reachable."
    else
        err "Cloud Run is healthy, but ${PUBLIC_BASE_URL}/${path} is not reachable. Check the domain mapping."
    fi
done
