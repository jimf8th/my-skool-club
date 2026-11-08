# Database Compatibility and Migration Safety

The production database is PostgreSQL backed by Cloud SQL. The repo’s deployment scripts and migration verification logic enforce a PostgreSQL-only configuration before release.

## Compatibility requirements

- Database engine must be PostgreSQL, not MySQL or SQL Server.
- Cloud SQL instance must be in the same region as the Cloud Run app.
- The instance must be attached to the expected VPC and use private networking.
- The app must use a private IP, not a public IP address.
- The schema manifest in `backend/src/main/resources/db/schema-manifest.txt` must be present before deployment.

## Migration validation

The deployment script validates the following before promoting the app:

1. the Cloud SQL instance exists and is in `RUNNABLE` state
2. the instance uses PostgreSQL
3. the instance is in the same region as deployment
4. the instance is attached to the expected VPC
5. the database exists
6. the schema manifest contains at least one table
7. a Cloud Run migration job runs successfully and verifies the schema

This protects the app from misconfigured database connections and accidental schema drift.

## Risk controls

- No Cloud Run deployment proceeds without a successful migration job.
- The migration job uses a dedicated service account and a dedicated job name.
- Secret values are injected separately from the app runtime settings and are not hard-coded in the source repo.
- The workflow is designed to fail closed rather than promote an invalid database configuration.
