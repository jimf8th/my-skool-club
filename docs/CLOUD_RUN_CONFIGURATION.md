# Cloud Run Configuration

The repository already contains the authoritative deployment values in `scripts/config.sh`, `scripts/deploy.sh`, and `cloud-run-service.yaml`.

## Service and network model

- Service name: `my-skool-club-app`
- VPC: `my-skool-club-vpc`
- Subnet: `my-skool-club-run`
- Cloud SQL instance: `my-skool-club-db`
- Artifact Registry repository: `my-skool-club`
- Service account: `my-skool-club-sa@<project>.iam.gserviceaccount.com`
- Region: `us-central1` by default

## Network design

The production design intentionally uses:

- private Cloud SQL with a private service connection
- direct VPC egress from Cloud Run
- private-ranges-only egress policy
- a dedicated subnet for serverless access

This makes the deployment consistent with the project’s private database policy and prevents accidental public DB exposure.

## Required runtime configuration

The Cloud Run service receives runtime settings matching the repo’s current deployment script:

- `SPRING_PROFILES_ACTIVE=prod`
- `PORT=8080`
- `CLOUD_SQL_INSTANCE=<project>:<region>:my-skool-club-db`
- `DB_NAME=myskoolclub`
- `DB_MAX_POOL_SIZE=5`
- `FRONTEND_URL=https://myskoolclub.com`
- `EMAIL_VERIFICATION_ENABLED=true`
- `MAIL_*` values for Gmail SMTP
- `OPENAI_MODEL` and `OPENAI_API_URL`
- `FIREBASE_PROJECT_ID=my-skool-club-web`

Secrets are injected from Google Secret Manager:

- `DB_USERNAME`
- `DB_PASSWORD`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `OPENAI_API_KEY`

## Manual preconditions

The repo does not contain remote Google Cloud credentials or GitHub deployment secrets, so the actual Cloud Run deployment must be activated only after the following are set up in the GitHub repo and GCP project:

1. a Workload Identity Federation provider
2. a Cloud Run service account with the required IAM permissions
3. a private Cloud SQL instance and VPC attachment
4. Artifact Registry repository creation
5. Secret Manager values for the app secrets
6. the repository variables and secrets expected by the workflow

This is intentionally not auto-enabled in source control.
