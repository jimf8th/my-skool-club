#!/bin/bash

# MySkoolClub Cloud Run Deployment Script
# This script builds and deploys the application to Google Cloud Run

set -e  # Exit on error

# Configuration
PROJECT_ID="my-skool-club-web"
SERVICE_NAME="my-skool-club-app"
REGION="us-central1"
IMAGE_NAME="myskoolclub"
ARTIFACT_REGISTRY_REPO="myskoolclub-repo"
ARTIFACT_REGISTRY_LOCATION="us"
IMAGE_TAG="latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  MySkoolClub Cloud Run Deployment${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo -e "${YELLOW}Setting GCP project to: ${PROJECT_ID}${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${YELLOW}Enabling required Google Cloud APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Add Artifact Registry permissions
echo -e "${YELLOW}Setting up Artifact Registry permissions...${NC}"
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="user:$(gcloud config get-value account 2>/dev/null)" \
  --role="roles/artifactregistry.writer" \
  --condition=None 2>/dev/null || echo -e "${YELLOW}Note: Permission may already exist${NC}"

# Generate a secure JWT secret
echo -e "${YELLOW}Generating secure JWT secret...${NC}"
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo -e "${GREEN}JWT secret generated successfully${NC}"

# MongoDB Configuration
MONGODB_URI="mongodb+srv://myskoolclub_db_user:zF5SWL47VJi3ZJKj@cluster0.wcli3u0.mongodb.net/?appName=Cluster0"
MONGODB_DATABASE="myskoolclub_prod"

# Create Artifact Registry repository if it doesn't exist
echo -e "${YELLOW}Creating Artifact Registry repository...${NC}"
gcloud artifacts repositories create ${ARTIFACT_REGISTRY_REPO} \
    --repository-format=docker \
    --location=${ARTIFACT_REGISTRY_LOCATION} \
    --description="Docker repository for MySkoolClub" \
    --project=${PROJECT_ID} 2>/dev/null || echo -e "${YELLOW}Repository already exists${NC}"

# Configure Docker authentication for Artifact Registry
gcloud auth configure-docker ${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev --quiet

# Build Docker image locally
echo -e "${YELLOW}Building Docker image locally...${NC}"
IMAGE_PATH="${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"
docker build -t ${IMAGE_PATH} .

# Push the Docker image to Artifact Registry
echo -e "${YELLOW}Pushing Docker image to Artifact Registry...${NC}"
docker push ${IMAGE_PATH}

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_PATH} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --concurrency 100 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "SPRING_PROFILES_ACTIVE=prod,SERVER_PORT=8080,JWT_SECRET=${JWT_SECRET},MONGODB_URI=${MONGODB_URI},MONGODB_DATABASE=${MONGODB_DATABASE}" \
  --execution-environment gen2 \
  --no-cpu-throttling

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

# Map custom domain
echo ""
echo -e "${YELLOW}Mapping custom domain to Cloud Run service...${NC}"
gcloud run domain-mappings create --service ${SERVICE_NAME} --domain myskoolclub.com --region ${REGION} 2>/dev/null || \
  echo -e "${YELLOW}Note: Domain mapping may already exist or require manual DNS configuration${NC}"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"
echo -e "${GREEN}Custom Domain: https://myskoolclub.com${NC}"
echo -e "${GREEN}Health Check: ${SERVICE_URL}/api/health${NC}"
echo ""
echo -e "${YELLOW}To complete custom domain setup:${NC}"
echo "  1. Verify domain ownership in Google Cloud Console"
echo "  2. Add DNS records as shown in Cloud Run domain mappings"
echo "  3. Wait for SSL certificate provisioning (may take up to 24 hours)"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo "  gcloud run services logs read ${SERVICE_NAME} --region ${REGION}"
echo ""
echo -e "${YELLOW}To view service details:${NC}"
echo "  gcloud run services describe ${SERVICE_NAME} --region ${REGION}"
echo ""
