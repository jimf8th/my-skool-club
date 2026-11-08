# Application Architecture

This repository is a single-service Cloud Run application with a private PostgreSQL database and a Java backend that also packages the React frontend into the Spring Boot artifact.

## Runtime topology

- Backend: Java 21 + Spring Boot 3.3.x
- Frontend: React + Vite
- Mobile: React Native + Expo
- Database: PostgreSQL on Cloud SQL, private IP only
- Web exposure: Cloud Run service with public ingress enabled but invoker IAM disabled
- Secret handling: Google Secret Manager
- Artifact storage: Artifact Registry
- Database migration: Cloud Run Jobs with Flyway

## Why the deployment model is single-service

The actual repo uses a single Cloud Run service name, `my-skool-club-app`, with the frontend bundled into the backend JAR and served as static assets through the Spring app. The deployment scripts and `cloud-run-service.yaml` both use the same service and one VPC network, one Cloud SQL instance, one service account, and one private-service range. This is the trusted production model and the deployment workflow must respect it.

## Security boundaries

- Cloud SQL is not reachable via a public IP.
- Cloud Run uses Direct VPC egress with a private-only egress policy.
- Secret values remain in Secret Manager and are injected at runtime.
- `--no-invoker-iam-check` is intentionally set so the public web app can reach the service without an `allUsers` binding while preserving application-level auth checks.
- database migration is executed in a separate Cloud Run Job before the application revision is promoted.

## Deployment flow

1. GitHub Actions runs the CI pipeline.
2. A new immutable image is built and pushed to Artifact Registry.
3. A staging Cloud Run service is validated against `/api/health`.
4. Database migration is applied via a Cloud Run Job.
5. Production Cloud Run deploy is executed only when enabling flags and required GCP secrets are configured.
6. A health check is run after production rollout and a previous revision is restored on failure.

## Operational constraints

- There is no production deploy without the required GitHub repository variables and Google Cloud admin identity configuration.
- Auto-release is gated behind `ENABLE_AUTOMATIC_PRODUCTION_DEPLOY` and the environment protection rules configured in GitHub.
- Application owner notifications are emitted only after the final deployment verdict is known.
