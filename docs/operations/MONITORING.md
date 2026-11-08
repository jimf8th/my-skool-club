# Monitoring and alerting

## Repository monitoring capabilities

The repo includes:

- CI workflow coverage in [.github/workflows/ci-tests.yml](.github/workflows/ci-tests.yml)
- Cloud Run deployment health checks in [.github/workflows/cloud-run-deploy.yml](.github/workflows/cloud-run-deploy.yml)
- Synthetic monitoring in [.github/workflows/synthetic-monitoring.yml](.github/workflows/synthetic-monitoring.yml)
- Operational health reporting in [.github/workflows/operational-health.yml](.github/workflows/operational-health.yml)

## What is monitored

- application health endpoint `/api/health`
- Cloud Run deployment success and failure
- synthetic public endpoint availability
- workflow failures and production health degradation
- dependency update and remediation status

## What is missing from the current workspace

- actual Google Cloud Monitoring dashboards and alert policies
- project-level incident routing and alert suppression policies
- live external notification integrations beyond optional GitHub/Slack/email configuration

## Operational guidance

Use the synthetic monitor and the repository workflows as the first line of automated detection. Treat the health endpoint and deployment gates as required controls, but keep high-volume alerting configured only after production telemetry is available in Google Cloud Monitoring.
