# Testing Gaps and Limitations

## Current known gaps

1. Full stateful API regression coverage across every controller is still partial. The repo has high-value endpoint checks for auth and onboarding flows, but not a full sweep of every REST route.
2. Full database parity for PostgreSQL-specific constraints is not yet covered with a dedicated Testcontainers PostgreSQL profile.
3. Browser automation is intentionally limited to a minimal critical path rather than a broad end-to-end test matrix.
4. Mobile device automation requires an actual simulator or device environment for Maestro; the GitHub Actions job only covers unit and component validation.
5. Some frontend tests emit React warnings about state updates in test environments. Those warnings are currently non-blocking, but they indicate an area for a follow-up cleanup.

## Areas recommended for Phase 2

- Add Testcontainers-backed PostgreSQL integration tests around repository constraints and transaction boundaries.
- Expand API regression coverage to all resource controllers.
- Add MSW-based frontend interaction tests for auth and role-based routing.
- Add a dedicated browser test coverage list for school, club, event, and invoice flows.
- Add device-level mobile workflows for login, member approval, and admin actions.
- Add project-wide coverage thresholds once the suite is stable enough to enforce them without false failures.

## Important note

The current testing baseline should be treated as an initial foundation, not as proof that the product is fully safe or production-ready. It provides the necessary automation gate to prevent regression while still documenting remaining gaps explicitly.
