Dependency remediation is restricted to `backend/` and `frontend/`.

Use the smallest compatible dependency or application change that fixes the linked Dependabot advisory. Preserve public API behavior, authentication, authorization, data validation and database integrity. Never expose credentials or customer data. Do not modify mobile, automation workflows, deployment infrastructure or credential files.

Do not weaken, skip or remove tests, lower coverage thresholds, ignore vulnerabilities, or disable security controls to make checks pass. Add a focused regression test when a source compatibility change needs one. Use Java 21 for the backend and Node 20 for frontend reproduction, matching CI.

Before requesting review, run backend Maven tests, frontend unit/component tests and browser regression checks where available. The repository CI also runs the existing shared regression checks. Link your remediation PR using `Closes #<the assigned issue number>` so its trusted origin can be verified automatically.

Address all review findings. Resolve a review thread only after its underlying problem is fixed. Do not claim an advisory is fixed until its affected dependency version has been removed or replaced. If upstream has not published a patch, investigate a compatible parent upgrade or replacement; report a blocker accurately when no validated repair exists.
