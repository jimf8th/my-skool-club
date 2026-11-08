# Test Coverage

## Summary

This repository already contains a meaningful baseline of automated tests across all three applications. Phase 1 focuses on stabilizing execution, enforcing standards in CI, and documenting what remains intentionally untested.

## Backend coverage

Backend coverage is produced by JaCoCo in Maven. The project currently includes service tests and MockMvc-based API checks. Coverage is generated at:

- `backend/target/site/jacoco/`
- `backend/target/jacoco.exec` during the Maven lifecycle

Coverage is intentionally focused on:

- Firebase session lifecycle and account linking
- school onboarding workflow and admin decisions
- account deletion boundaries and authorization behavior

## Frontend coverage

The web app uses Vitest with coverage enabled via the Vite config. Coverage output is written to:

- `frontend/coverage/`

Coverage targets are intentionally reported as baseline goals rather than proof of application safety.

## Mobile coverage

The Expo app uses Jest with the `coverage` flag and writes reports to:

- `mobile/coverage/`

The current suite includes component and utility tests around auth, app environment config, and screen flows.

## Commands

Backend:

```bash
cd backend
./mvnw test
./mvnw verify
```

Frontend:

```bash
cd frontend
npm run test
npm run test:coverage
npm run test:e2e
```

Mobile:

```bash
cd mobile
npm test -- --runInBand --coverage
```

## Current status

Coverage is measured as a live result of the current suite rather than a simulated target. Important gaps still remain in:

- deeper end-to-end business workflows
- API contract regression across all controllers
- device-level mobile journeys requiring a simulator or real hardware

These gaps are documented in `TEST_GAPS.md`.
