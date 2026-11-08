# Phase 3 Validation Plan

This phase verifies the delivery of a safe Cloud Run deployment workflow built around the repository’s actual configuration and constraints.

## Validation criteria

The workflow is considered valid only when all of the following conditions are met:

1. the CI validation suite still passes
2. the Docker image contains the compiled frontend only after build
3. the Cloud Run deployment uses the single-service topology defined by the repo
4. the migration job runs successfully before production rollout
5. staging health verification passes before production promotion
6. production health verification occurs after deployment
7. failed health checks trigger automatic rollback
8. owner notifications fire once the final status is known

## Required pre-production checks

Before enabling automatic production deployment, the following must be configured:

- GCP project and region variables
- Workload Identity Federation provider
- runtime service account
- Artifact Registry repository
- VPC and private Cloud SQL configuration
- Secret Manager secrets for app credentials
- GitHub environment protections for staging and production
- desired notification integrations

## Exit conditions

- Auto-deploy stays off until all required secrets and variables exist.
- The workflow must fail closed when any required Cloud resource or secret is missing.
- The owner is notified of both success and rollback outcomes.

This is the minimum gate for safe release automation without violating the project’s existing security and deployment model.
