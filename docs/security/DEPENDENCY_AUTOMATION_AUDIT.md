# Dependabot automation readiness audit

Audit date: November 8, 2026. Source commit: `83b41a05f63a7eb3ebc7931302dc66cbe56f2005`.

The requested alert → Copilot fix → review → tests → merge → backend/frontend/mobile deployment process is incomplete. The backend and bundled frontend deployment works after a normal push to main. Copilot remediation, automatic review and merge, and mobile release completion remain missing or blocked.

This audit inspected repository source, live GitHub settings, secret names (not values), all pages of open alerts, and recent workflow jobs. It ran focused checks of the existing classifier and remediation eligibility script. It did not change repository settings or enable any release automation.

## Verified live state

| Area | Observed state |
| --- | --- |
| Dependabot alerts | Enabled; 143 open alerts |
| Severity | 4 critical, 79 high, 50 medium, 10 low |
| Alert manifests | `frontend/package-lock.json`: 43; `mobile/package-lock.json`: 100 |
| Alerts without a first patched version | 2; these need explicit investigation rather than an assumed version bump |
| Dependabot security fixes | Enabled and not paused |
| GitHub native auto-merge | Disabled |
| Delete merged branches | Disabled |
| Classic main branch protection | Not configured; GitHub returned `Branch not protected` |
| Repository ruleset | `Main and Develop Branch Protection`, ID 11472047, is disabled |
| Default workflow token | Read permissions; Actions cannot approve PR reviews |
| Repository Actions secrets | Only `GCP_SERVICE_ACCOUNT_EMAIL` |
| Dependabot secrets | None |
| Environment secret names | No secrets in `production`, `staging`, or `copilot` |
| Automatic Cloud Run production deployment | Enabled |
| Automatic iOS release | Disabled |
| Copilot entitlement and automatic-review settings | Not verified by the available settings endpoints; the existence of a `copilot` environment does not establish readiness |

No backend manifest appeared in the current Dependabot alert response. This does not establish that backend dependencies are free of vulnerabilities or that all transitive dependency surfaces are reported.

## What already works

- `.github/dependabot.yml` covers Maven backend dependencies, npm frontend and mobile dependencies, GitHub Actions, and the root Dockerfile.
- `.github/workflows/ci-tests.yml` runs backend unit/integration tests, frontend component tests, Playwright tests, mobile Jest tests, and dependency review for PRs.
- The normal main-branch deployment builds an image containing the backend and compiled frontend, deploys staging, verifies staging health, executes the migration job, deploys production, and checks production health.
- [CI run 42536206166](https://github.com/jimf8th/my-skool-club/actions/runs/42536206166) and [deployment run 42536206477](https://github.com/jimf8th/my-skool-club/actions/runs/42536206477) passed for the audited commit. Production revision `my-skool-club-app-00034-5xl` was ready with 100% traffic after that deployment.

## Required changes

### 1. Make risk classification and review enforceable before enabling unattended merges

Sources: `.github/scripts/classify-dependency-risk.js`, `.github/security/dependency-risk-policy.yml`, `.github/workflows/dependency-validation.yml`.

- The classifier does not enforce the policy's `sensitivePaths`. It accepts arbitrary YAML as manifest-only. A focused execution classified a lodash patch touching both `frontend/package.json` and `.github/workflows/cloud-run-deploy.yml` as `LOW` with `autoMergeEligible: true`.
- Replace broad filename regexes with explicit manifest/lockfile allowlists and enforce sensitive application, deployment, runtime, and automation paths.
- Treat missing or inconsistent metadata conservatively. Obtain real advisory severity rather than assuming a metadata output exists; high/critical severity must affect the final classification consistently.
- PRs originating from Copilot are not included by the current Dependabot-author-only preflight condition. Add an explicit, verified link to the originating dependency task, and evaluate their source changes under the review policy.
- The review gate accepts a `copilot-reviewed` label as proof. No workflow requests that review or verifies the review's author, reviewed commit, disposition, or unresolved findings.
- The human-review check accepts any historical `APPROVED` review without evaluating the latest state and current head commit. Review submissions/dismissals and label changes do not trigger a new validation run.
- Require actual review evidence for the current commit, rerun the gate after review changes, and enforce the resulting checks through an active branch rule. Configure the intended Copilot approval behavior explicitly; do not synthesize approvals with labels.

GitHub documents that Copilot review approvals are disabled by default and require configuration. See [Copilot code review](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-code-review).

### 2. Connect failed dependency updates to Copilot

Sources: `.github/workflows/dependency-remediation.yml`, `.github/scripts/ai-remediation-eligibility.js`.

- Automatic workflow-run events always supply risk `UNKNOWN` and ecosystem `maven`, rather than the validated PR classification and actual ecosystem. `UNKNOWN` is rejected by the eligibility script. The automatic failure path therefore never reaches a coding agent.
- A focused execution with a failed PR and the automatic defaults returned `eligible: false` and `risk: UNKNOWN`.
- Even the eligible path only creates an unassigned issue. There is no assignment to Copilot, agent task creation, change-monitoring loop, or remediation PR validation.
- [Remediation run 42531317992](https://github.com/jimf8th/my-skool-club/actions/runs/42531317992) reported success while `create-remediation-issue` was skipped and `notify-human-review` ran. Workflow success is not proof of a repaired dependency.
- Resolve the PR from the triggering workflow, validate its repository/author/head SHA and open state, derive metadata from trusted sources, and attach sanitized failure information.
- Deduplicate requests per PR/head and cap retries. Verify permission errors and agent failures rather than swallowing them with `.catch(() => {})`.
- Configure a supported Copilot invocation and its credentials. GitHub's agent tasks API requires a user-to-server token, and its issues API supports Copilot assignment. Confirm entitlement and token permissions before choosing the integration.
- Define how drafts, review feedback, changes requested, workflow approval requirements, and exhausted remediation attempts are handled.

See [using Copilot via the API](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-via-the-api) and [Copilot agent restrictions](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/risks-and-mitigations). Default workflow approval requirements can interrupt unattended execution; those settings were not verified in this audit.

### 3. Repair automatic merge and preserve the deployment trigger

Source: `.github/workflows/dependency-validation.yml`, auto-merge job.

- `autoMergeRequest: null` normally means auto-merge has not been requested. The script currently treats that value as evidence that native auto-merge is unavailable and exits before requesting it.
- The job has no checkout and does not supply `--repo` to `gh pr view` or `gh pr merge`, so repository discovery is not reliable on its fresh runner.
- Both view/merge errors are swallowed, allowing a green job without an enabled merge.
- Enable native auto-merge after the classification/review/check gates are correct; enable deletion of merged branches if desired.
- Use explicit repository and exact-head identifiers. Surface merge failures and track whether the PR actually merged.
- Merges performed with the repository `GITHUB_TOKEN` can suppress the expected push-triggered deployment. Use a suitable automation identity or explicitly dispatch the deployment after confirming the merged commit, with deduplication.
- A token for privileged merging/deployment must not be exposed to PR code execution. Keep privileged orchestration on trusted workflow code and validate the exact commit and all required checks.

See [GitHub workflow trigger behavior](https://docs.github.com/en/actions/concepts/security/github_token).

### 4. Complete mobile deployment

Sources: `.github/workflows/ios-monthly-release.yml`, `.github/scripts/ios-release-risk.js`, `.github/ios-release-manifest.json`, `mobile/eas.json`.

- The iOS workflow is scheduled for the first Saturday of the month or manually dispatched. A dependency merge does not trigger it.
- `ENABLE_IOS_AUTOMATIC_RELEASE=false`, and `EXPO_TOKEN` and the referenced Apple credentials are absent from repository and inspected environment secrets. The signing/submission configuration in EAS was not accessible through this audit.
- The Maestro step requires an installed CLI and a running target app/device, but the workflow provisions neither.
- The build uses Node 20 while normal mobile CI uses Node 22. Align the tested and released environments.
- `dry_run` and `force_release` inputs are declared but do not control execution. Manual dispatch can enter the EAS build even while automatic release is disabled and `dry_run=true`.
- The workflow builds an iOS archive but has no `eas submit` or equivalent submission step and no Apple release-completion tracking.
- From the `mobile` working directory, manifest updates resolve `mobile/.github/ios-release-manifest.json`, while the real manifest is at the repository root. Updates are neither committed nor uploaded, and `lastSuccessfulRelease` is not advanced.
- Android distribution is outside the owner's clarified scope. Google Play credentials and releases are not required.
- Choose the desired mobile release destinations and cadence, provision signing/store credentials, run device smoke tests, submit the exact tested build, and persist build/submission/release identifiers. Store approval and actual availability must be tracked separately from a successful build.

### 5. Turn reporting into verified outcomes

Sources: `.github/workflows/dependency-security-report.yml`, `.github/workflows/dependency-notifications.yml`, `.github/workflows/operational-health.yml`.

- Alert export suppresses API failures with `|| true`. Verify Dependabot alert-read authorization for the chosen identity and fail or explicitly report an unavailable export.
- GitHub workflow-run notifications look for `context.payload.pull_request`, which is absent on a workflow-run event. Resolve associated PRs from that event instead.
- Email steps currently print messages; they do not send email.
- Operational health uses hardcoded zero counts rather than alert, release, deployment, and rollback data.
- Close the loop by confirming that each advisory is fixed on the default branch after merge, not merely that a dependency PR or deployment passed. Track alerts with no patched version separately.

## Acceptance checks before declaring the system automatic

1. A small frontend dependency update is classified, reviewed, tested, merged, removed as a branch, deployed, and confirmed fixed by the alert API.
2. Equivalent backend and mobile updates exercise their actual artifact and release paths.
3. A deliberate dependency compatibility failure produces one Copilot remediation task, receives a code change, reruns tests and review on its latest commit, and does not loop indefinitely.
4. An update touching auth, runtime, workflow, or deployment files cannot qualify for unattended merge through a benign package name or label.
5. Stale approvals, dismissed reviews, missing metadata, failed checks, agent errors, and unavailable credentials keep the PR unmerged and produce a visible actionable result.
6. An automation-originated merge starts exactly one deployment for the merged SHA.
7. Mobile dry runs do not build or submit; a real release tests the app on a device/simulator, submits the recorded build, persists release state, and reports store status accurately.

The current repository has not demonstrated these end-to-end acceptance checks. Completing the verified backend/frontend deployment is one part of that process, not proof that Dependabot remediation and mobile release automation are ready.
