# Testing Strategy

## Scope and repository findings

This monorepo contains three deployable application surfaces backed by a shared Spring Boot API:

- Backend: Java 21, Spring Boot 3.3.4, Maven, PostgreSQL, Flyway, Firebase Auth, OpenAI receipt scanning
- Frontend: React 18 + Vite + Vitest + Testing Library + Playwright for browser smoke tests
- Mobile: Expo SDK 54 / React Native 0.81.5, Jest + React Native Testing Library, Maestro smoke tests present in `mobile/e2e/maestro`

The repository is not using a generic multi-module Maven layout. The backend lives under `backend/` and is the authoritative application API. The web frontend is built by Maven as part of the backend lifecycle, and its production bundle is copied to backend static resources before packaging.

## Actual database and persistence

The actual production database is PostgreSQL. Confirmed from:

- `backend/src/main/resources/application-dev.properties` and `application-prod.properties` using `jdbc:postgresql://...`
- `docker-compose.yml` defining a `postgres:16-alpine` service
- `cloud-run-service.yaml` wiring Cloud SQL to the application runtime
- Flyway migrations in `backend/src/main/resources/db/migration`

The repository uses Spring Data JPA with repository interfaces under `backend/src/main/java/com/myskoolclub/backend/repository`. Data access is repository-based entity persistence, not NoSQL.

## Authentication and authorization design

Authentication is Firebase-based, not JWT-issued custom auth:

- `SecurityConfig` installs a `FirebaseAuthenticationFilter` before `UsernamePasswordAuthenticationFilter`
- `FirebaseTokenVerifier` validates Firebase ID tokens via the Firebase Admin SDK
- `UserRepository` has `findByFirebaseUid` and `findByGoogleSub` methods, indicating account linking by Firebase identity
- public auth flows are limited to `/api/auth/**` and `/api/health`
- all other `/api/**` routes require authentication
- method-level role checks use Spring Security `@PreAuthorize`

Application roles are encoded as app roles and membership roles managed in JPA entities rather than in custom JWT claims.

## External dependencies and infrastructure

- Firebase Authentication and Firebase Admin SDK for identity and session syncing
- Google Cloud SQL PostgreSQL in production
- Google Cloud Run deployment via `cloud-run-service.yaml` and scripts in `scripts/`
- OpenAI API for invoice/receipt scan assistance
- SMTP mail delivery configured via Spring mail and MailHog locally
- Local `docker-compose.yml` includes PostgreSQL and MailHog only

There is no evidence of Stripe, PayPal, Twilio, or other payment processors in the source; the app depends on Firebase, Google Cloud, PostgreSQL, OpenAI, and mail transport.

## Existing automated tests and current baseline

### Backend

Backend tests already exist under `backend/src/test/java` and include:

- app context smoke tests
- service tests around Firebase session creation and account actions
- school onboarding request service tests
- mock-MVC and security-based controller tests

### Frontend

The web frontend already has Vitest tests for auth context, API-heavy components, forms, and pages.

### Mobile

The mobile app already includes Jest-based React Native tests and Maestro smoke-test specs.

## Test principles for this phase

- Do not change business logic.
- Keep tests tied to existing behavior and contracts.
- Prefer real app configuration for unit/service tests and mock only external-facing dependencies.
- Use H2 for default unit and integration tests; keep production PostgreSQL semantics in mind.
- Rely on Maven lifecycle separation:
  - `test` for unit tests
  - `verify` for integration/API regression tests
- Keep CI local-first and avoid production credentials for normal PR validation.

## Test pyramid and execution model

1. Unit tests: fast validation of business logic and boundary conditions
2. Integration tests: repository and service behavior with the application context
3. API regression tests: controller request/response contract checks under MockMvc
4. Browser smoke tests: critical journeys with Playwright
5. Mobile unit tests: component and auth-state validation
6. Device tests: Maestro flows only where a simulator/device is available

## CI and environments

The repository includes local environment configuration in `.env.example` and Docker Compose. CI validation should use ephemeral runners and local services only. No production deployment or credentials should be required for normal PR validation.

## Coverage goals

Initial goals for Phase 1 are intentionally directional rather than safety guarantees:

- Backend business logic: 80% line coverage
- Backend integration: critical persistence and API paths
- Frontend: 80% line coverage
- Mobile: 70% line coverage
- Critical business workflows: all high-priority journeys

The current repository already contains tests; the next step is ensuring the test framework enforces them consistently and documents their limits.
