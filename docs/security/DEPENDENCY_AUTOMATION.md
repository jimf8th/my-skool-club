# Backend and frontend dependency automation

Follow [the setup guide](DEPENDENCY_AUTOMATION_SETUP.md) before enabling unattended processing. The [historical audit](DEPENDENCY_AUTOMATION_AUDIT.md) records the state before implementation and before the owner excluded mobile releases.

## Scope and execution

- Dependabot version updates cover Maven under `/backend` and npm under `/frontend`.
- Alert remediation accepts only `backend/pom.xml`, `frontend/package.json`, and `frontend/package-lock.json`. GitHub may continue to show alerts for other manifests; those are excluded from this automation.
- Automatic remediation, review and merge require every changed path (including the previous path of a renamed file) to remain inside `backend/` or `frontend/`. Mobile, infrastructure, Docker and GitHub Actions updates are outside this scope.
- Pull-request CI has read-only access. The shared repository CI retains its existing backend, frontend, browser, mobile Jest and security regression checks, plus automation policy tests. It needs no Expo or app-store credentials.
- Dependency remediation executes trusted default-branch code after CI completes and every 15 minutes. It never checks out or executes PR code with the automation token.
- A Copilot-capable user token groups scoped alerts by manifest/package and creates at most two concurrent coding tasks. Failed eligible PRs receive at most three repair requests, once per head commit.
- Copilot PRs must link to a scoped task created by that automation identity. Unrelated and fork PRs are skipped.
- Every automatic merge requires all six CI jobs on the current head, an actual current-head Copilot approval, no changes requested, resolved threads, clean merge state and enforced up-to-date branch protection. Labels are not approval evidence. The merge uses an atomic SHA precondition.
- Backend configuration and security repairs within scope use the same automated review and test gates. Credential files remain excluded. Unknown risk is never classified as a low-risk patch.
- User-token merges emit the normal main push event. Cloud Run validates again, builds the backend and bundled frontend, verifies staging, runs migrations, deploys production and checks health. Deployments are serialized per branch.

## Configuration

Required repository Actions secret: `DEPENDENCY_AUTOMATION_TOKEN`. No Expo, Apple or Google Play setup is required for this scope.

`ENABLE_DEPENDENCY_AUTOMATION` defaults to disabled. `ENABLE_AUTOMATIC_PRODUCTION_DEPLOY` governs the existing backend/frontend rollout.

Run `bash scripts/configure-dependency-automation.sh --check`, then `--apply` after the implementation passes on main. Validate the dry run and one controlled Copilot change before `--enable`. Use `--disable` to stop new unattended work.

## Validation

Run `node --test .github/scripts/*.test.js` and actionlint. Tests cover scope filtering, protected changes and renames, stale/dismissed reviews, changes requested, exact-head CI, forks, unrelated agent PRs, bounded same-head remediation and atomic merging.

Verify the matching advisory closes on the default branch after a merge. Passing CI or deployment alone does not establish that a vulnerable dependency was removed.
