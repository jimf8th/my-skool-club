# Test Execution Guide

## Local prerequisites

### Backend

- Java 21
- Maven wrapper in `backend/`
- Docker Desktop or equivalent for PostgreSQL if running local database-backed checks

### Frontend

- Node.js 20+
- npm 10+

### Mobile

- Node.js 20+
- Expo CLI dependencies
- Jest environment for local runtime tests
- Simulator or device for Maestro flows

## Backend

Start the local database:

```bash
docker compose up -d postgres mailhog
```

Run the backend suite:

```bash
cd backend
./mvnw test
./mvnw verify
```

The `test` phase runs unit tests and the `verify` phase runs integration tests plus coverage generation.

## Frontend

Install dependencies:

```bash
cd frontend
npm install
```

Run unit/component tests:

```bash
npm run test
```

Run browser tests:

```bash
npm run test:e2e
```

## Mobile

```bash
cd mobile
npm install
npm test -- --runInBand
```

Maestro specs are present under `mobile/e2e/maestro` but require a simulator/device and are not expected to run in the default GitHub Actions job without a device environment.

## CI workflow behavior

The GitHub Actions workflow in `.github/workflows/ci-tests.yml` runs:

- backend unit + integration tests
- frontend unit/component tests
- Playwright browser smoke tests
- mobile unit tests
- CodeQL and dependency review

It is designed to fail the job if any required test stage fails and uploads reports as artifacts.

## Required secrets or external dependencies

For normal PR validation, no production secrets are required. The local database and MailHog in Docker are enough. The following values are only used when exercising production-linked workflows:

- Firebase project credentials
- Cloud SQL / Cloud Run environment
- OpenAI API key
- production mail configuration

These remain out of the normal CI path.
