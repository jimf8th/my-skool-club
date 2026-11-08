# CI/CD Pipeline Design

The repository contains the baseline quality gate workflow in `.github/workflows/ci-tests.yml` and the deployment workflow in `.github/workflows/cloud-run-deploy.yml`.

## Validation pipeline

The CI pipeline runs the following jobs:

- backend-tests
- frontend-tests
- playwright-tests
- mobile-tests
- security-checks

This workflow is used as a reusable validation gate through `workflow_call`, allowing both PR validation and deployment orchestrations to use the same quality bar.

## Deployment pipeline stages

1. Validate
   - Reuse the CI workflow.
2. Build
   - Build the Docker image containing the Java app and bundled frontend static assets.
   - Push to Artifact Registry as an immutable image tag.
3. Staging
   - Deploy to a staging Cloud Run service.
   - Run `/api/health` verification before promotion.
4. Migration
   - Execute the Flyway migration Cloud Run Job.
5. Production
   - Deploy the production Cloud Run service only when automatic deployment is explicitly enabled.
   - Validate `/api/health` after rollout.
6. Rollback
   - Restore the last known-good revision if the health check fails.
7. Notification
   - Publish deployment outcome to GitHub Actions logs and optional Slack / e-mail notification targets.

## Required GitHub configuration

The deployment pipeline requires repository-level variables and repository secrets:

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `PUBLIC_BASE_URL`
- `MAIL_FROM`
- `OPENAI_MODEL`
- `OPENAI_API_URL`
- `ENABLE_AUTOMATIC_PRODUCTION_DEPLOY`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`
- optional: `SLACK_WEBHOOK_URL`
- optional: `ALERT_EMAIL_RECIPIENTS` (single comma-separated owner list; legacy fallback `DEPLOY_NOTIFICATION_EMAIL`)

## Safety guardrails

- Production deploy is disabled by default.
- `workflow_dispatch` requires an explicit production deployment flag.
- Cloud Run health checks are mandatory before the pipeline can declare success.
- A failed health check triggers an automatic rollback to the previous revision.
- The app owner is notified after each outcome.
