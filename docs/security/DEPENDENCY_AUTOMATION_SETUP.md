# Set up dependency automation

This guide configures `jimf8th/my-skool-club` for Dependabot alerts → Copilot fixes → review → tests → merge → Cloud Run.

The implementation must first be merged and validated on `main`. Creating a token alone does not activate it. During setup keep `ENABLE_DEPENDENCY_AUTOMATION` unset or `false`.

Never paste credentials into chat, commit them, or put them in the project `.env`. The GitHub and Expo tokens go into repository **Actions secrets**; Apple submission keys are stored with Expo's app credentials. Keep recovery copies in a password manager.

## 1. Enable Copilot for the GitHub account and repository

1. Sign in as the GitHub user that will own the automation token. This user needs repository write access and a paid Copilot plan that permits cloud-agent tasks and code review.
2. Open [GitHub Copilot settings](https://github.com/settings/copilot). Enable the coding/cloud agent and code review for this repository. Organization policies can override account settings.
3. Open the repository's Settings → Copilot → Code review settings where available. Configure automatic review of new PRs and new pushes, and enable Copilot **approving reviews** for application dependency changes if your plan/settings expose that feature. Our workflow also requests reviews explicitly.
4. Configure whether trusted Copilot PRs can run Actions without individual approval, if that setting is available. Otherwise GitHub can require a maintainer to approve workflow execution for each Copilot PR.
5. If Copilot only submits COMMENTED reviews, a maintainer must approve the tested commit. The automation does not convert a comment or a label into an approval. Workflow/deployment/signing/credential changes always remain maintainer work.

[GitHub's Copilot API documentation](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-via-the-api) describes supported authentication. [Copilot code review](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-code-review) explains approval configuration.

## 2. Create the GitHub automation token

1. Open [GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/personal-access-tokens).
2. Click Generate new token. Name it `my-skool-club-dependency-automation` and choose an expiration date you can track and renew.
3. Choose the resource owner that owns `jimf8th/my-skool-club`.
4. Under Repository access, select Only select repositories and choose `my-skool-club`.
5. Add these **repository permissions**:

| Permission | Access | Purpose |
| --- | --- | --- |
| Actions | Read and write | Inspect workflow results and support Copilot task execution |
| Contents | Read and write | Merge reviewed changes and remove merged branches |
| Issues | Read and write | Create and assign remediation tasks |
| Pull requests | Read and write | Request reviews, inspect feedback, and merge |
| Administration | Read-only | Verify the required main-branch protection is enforced |
| Dependabot alerts | Read-only | List current alerts and verify remediation |
| Metadata | Read-only | Required repository metadata; normally included automatically |

6. Generate the token and copy it once. A token tied to an organization may require administrator approval before it can be used.
7. Open [Repository → Settings → Secrets and variables → Actions](https://github.com/jimf8th/my-skool-club/settings/secrets/actions).
8. Click New repository secret. Name: `DEPENDENCY_AUTOMATION_TOKEN`. Secret: the generated token. Click Add secret.

Use the Copilot-enabled user's token, not `GITHUB_TOKEN` or a server-to-server installation token. The user token also lets a merged commit trigger the normal main push deployment without dispatching duplicate releases. Do not grant this token administration write access or branch-protection bypass access.

## 3. Apply GitHub settings after the implementation passes on main

The required secret is only `DEPENDENCY_AUTOMATION_TOKEN`. An existing `EXPO_TOKEN` may remain saved, but this automation does not read or require it.

Install GitHub CLI and sign in locally using an administrator account:

```bash
brew install gh
gh auth login
```

From the repository root on the updated main branch:

```bash
bash scripts/configure-dependency-automation.sh --check
bash scripts/configure-dependency-automation.sh --apply
```

The setup tool verifies the secret name and passing main checks before applying settings. It enables native auto-merge and deletion of merged branches and enforces up-to-date CI, a current approval, resolved conversations, and no administrator bypass on main. It creates the remediation tracking label. It uses your local administrator login to write these settings; the automation token only needs Administration read access.

Keep Dependabot alerts and security updates enabled under repository Settings → Code security / Dependabot. The version-update configuration monitors `/backend` Maven and `/frontend` npm only. Alert reports filter those same manifests; unrelated alerts can remain visible in GitHub.

The existing `ENABLE_AUTOMATIC_PRODUCTION_DEPLOY=true` setting controls production deployment of the backend and bundled frontend. Shared CI continues running the repository's existing regression suites; no native builds or mobile releases are started.

## 4. Validate the token and Copilot, then activate

1. In GitHub → Actions → Dependency remediation → Run workflow, select main, `dry_run=true` and `scan_alerts=true`.
2. Confirm the run can inspect scoped alerts, PRs and branch protection without permission failures. A dry run creates no issues, agent tasks, review requests or merges.
3. Verify Copilot can be assigned one controlled backend/frontend task and can approve the resulting tested head. Read-only inspection cannot prove subscription entitlements or write operations.
4. If Copilot only comments, enable approving reviews where offered or obtain a maintainer approval. If GitHub requires approval to start Copilot PR workflows, configure the supported automatic-run setting or approve those runs individually.
5. Once validated, run:

```bash
bash scripts/configure-dependency-automation.sh --enable
```

This sets `ENABLE_DEPENDENCY_AUTOMATION=true`. Automatic processing runs every 30 minutes and after the relevant CI/deployment workflows complete. It creates at most two concurrent coding tasks and sends no more than three repair requests per PR. Every automatic merge still requires the tested head, a real approval and satisfied branch protection.

Only files inside `backend/` and `frontend/` may be changed by eligible PRs. Source and previous filenames are checked, so mixed mobile/web PRs and renames from other areas are excluded. Sensitive backend security/configuration changes remain maintainer-reviewed.

To stop new automatic dependency work:

```bash
bash scripts/configure-dependency-automation.sh --disable
```

Already-running workflows or agent tasks are unaffected by that flag.

## 5. Verify the first complete change

Watch GitHub Actions → Dependency remediation for the task and review decisions. The resulting dependency PR must pass the backend, frontend, browser, existing mobile Jest, security and automation policy regression checks. These shared tests do not extend the permitted change scope.

After the reviewed PR merges, its user-token push starts Cloud Run Deployment. Verify image publication, staging health, the migration job, production deployment and production health. The container includes both the backend and compiled frontend.

Confirm the corresponding backend/frontend advisory closes on main after GitHub rescans it. A successful build or deployment alone does not prove a vulnerable dependency was removed. Alerts without a patched version remain visible for maintainer mitigation.

If a token expires, replace `DEPENDENCY_AUTOMATION_TOKEN` on the Actions secrets page. If the automation identity changes, migrate its tracked issues: the orchestrator deliberately trusts scoped tasks created by the configured automation user.
