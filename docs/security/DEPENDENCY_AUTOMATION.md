# Dependency automation

Follow [the step-by-step setup guide](DEPENDENCY_AUTOMATION_SETUP.md) before enabling unattended processing. The [audit](DEPENDENCY_AUTOMATION_AUDIT.md) records the state before this implementation.

## Execution model

- Dependabot monitors backend Maven, frontend and mobile npm dependencies, GitHub Actions and Docker.
- Pull-request CI has read-only access and runs backend unit/integration, frontend component, browser, mobile Jest, security/dependency review and automation policy tests.
- The Dependency remediation workflow runs trusted default-branch code after CI completes and every 30 minutes. It never checks out or executes pull-request code with the automation token.
- A Copilot-capable user token reads current alerts, groups them by manifest/package, and creates at most two concurrent coding tasks. Existing failed dependency PRs receive at most three repair requests, once per head commit.
- Copilot-origin PRs must be linked to a task created by that automation identity. Unrelated and fork PRs are skipped.
- Every automatic merge requires all six CI jobs on the current head, an actual current-head approval, no changes requested, resolved threads, a clean merge state and enforced up-to-date branch protection. Labels are not approval evidence. The merge uses an atomic SHA precondition.
- Automation, deployment, signing, credential and sensitive backend configuration changes require a maintainer. Unknown risk is never classified as a low-risk patch.
- The user-token merge emits the normal main push event. Cloud Run validates again, builds the backend and bundled frontend, verifies staging, runs migrations, deploys production and verifies health. Deployments are serialized per branch.
- After a successful main Cloud Run deployment, relevant mobile changes start iOS native smoke tests and production builds in Expo Workflows. Each exact production build is submitted to TestFlight. Submission records are GitHub prereleases, with incomplete attempts held as drafts to prevent duplicates.

## Configuration

Repository Actions secrets: `DEPENDENCY_AUTOMATION_TOKEN`, `EXPO_TOKEN`. Platform signing and store submission keys are managed in Expo.

Activation flags: `ENABLE_DEPENDENCY_AUTOMATION`, `ENABLE_MOBILE_BETA_RELEASE`. Both default to disabled. `ENABLE_AUTOMATIC_PRODUCTION_DEPLOY` governs the existing backend/frontend rollout. The old iOS monthly placeholder no longer starts a competing release process.

Run `bash scripts/configure-dependency-automation.sh --check`, then `--apply` after the implementation passes on main. Validate the credentials and dry runs before `--enable`. Use `--disable` to stop new unattended work.

## Validation

Run `node --test .github/scripts/*.test.js` and actionlint. The tests cover protected file changes and renames, stale/dismissed reviews, changes requested, exact-head CI, forks, unrelated agent PRs, bounded same-head remediation and atomic merging. Expo workflow validation also checks account capabilities; native Maestro jobs require an eligible paid Expo plan.

A green build or successful upload is not proof that a security advisory has closed or a store build is available to testers. Inspect current Dependabot alerts and the store processing results.
