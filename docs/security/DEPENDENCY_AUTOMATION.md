# Dependency Automation

## Repository dependency surfaces

This monorepo contains the following dependency manifests and lockfiles:

- Backend: `backend/pom.xml`
- Frontend: `frontend/package.json` and `frontend/package-lock.json`
- Mobile: `mobile/package.json` and `mobile/package-lock.json`
- Container image: `Dockerfile`
- Local services: `docker-compose.yml`
- Deployment config: `cloud-run-service.yaml`
- GitHub automation: `.github/workflows/`

## Existing Phase 1 test integration

The repository already includes the Phase 1 validation pipeline in `.github/workflows/ci-tests.yml` for:

- backend Maven unit and API regression checks
- frontend Vitest tests
- Playwright smoke tests
- mobile Jest suite
- security scans via CodeQL and dependency review

This Phase 2 automation reuses that workflow rather than creating a parallel testing implementation.

## Dependency risk themes in this repo

The highest-risk dependency classes are:

- Spring Boot and Spring Security for authz/authn
- Firebase Admin and Firebase client libraries for identity/session management
- PostgreSQL and Flyway drivers for database persistence and migrations
- OpenAI integration and runtime mail configuration
- Docker and deployment config for Cloud Run

## Dependabot configuration

Dependabot is configured in `.github/dependabot.yml` to monitor:

- Maven updates under `/backend`
- npm updates under `/frontend`
- npm updates under `/mobile`
- GitHub Actions updates at the repo root
- Docker image updates at the repo root

Patch updates are grouped by ecosystem to reduce PR noise, while major updates remain isolated and manual review is required.

## Security-update behavior

Security alerts from Dependabot are separate from scheduled version updates. Dependabot security updates are driven by GitHub advisory data and repository security settings; they are not fully controlled by `dependabot.yml` alone. The workflow and repo settings must still enable security updates and alerts.

## Manual settings required in GitHub

The repository owner must enable the following before production use:

- Dependabot alerts
- Dependabot security updates
- GitHub Actions read/write permissions for PR automation
- Branch protection or repository ruleset status checks
- GitHub auto-merge support for low-risk PRs
- Optional Copilot coding-agent support for remediation tasks
- Email or notification provider, if email delivery is needed

## Important guardrails

- No production deployment is introduced as part of this automation.
- No `pull_request_target` workflow is used for untrusted PR code.
- Low-risk updates are the only ones eligible for native auto-merge.
- Medium- and high-risk updates remain manual.
