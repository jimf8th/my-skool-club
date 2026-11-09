# Set up dependency automation

This guide configures `jimf8th/my-skool-club` for Dependabot alerts → Copilot fixes → review → tests → merge → Cloud Run → TestFlight and Google Play internal testing.

The implementation must first be merged and validated on `main`. Creating tokens alone does not activate it. During setup keep `ENABLE_DEPENDENCY_AUTOMATION` and `ENABLE_MOBILE_BETA_RELEASE` unset or `false`.

Never paste credentials into chat, commit them, or put them in the project `.env`. The GitHub and Expo tokens go into repository **Actions secrets**; Apple and Google submission keys are stored with Expo's app credentials. Keep recovery copies in a password manager.

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

## 3. Prepare Expo and create EXPO_TOKEN

1. Sign in to [Expo](https://expo.dev/) using the account with access to the existing project. The configured EAS project ID is `543ebf4b-fa14-4d36-a40e-a90fb85c6538`.
2. Open account settings → Access tokens → Create token. Name it `my-skool-club-github-actions`.
3. If you limit token access, include this project and the permissions required for EAS builds, Workflows and submissions. The user must have access to both preview and production environments and app credentials.
4. Copy the generated token.
5. Return to the same GitHub Actions secrets page and add a repository secret named `EXPO_TOKEN`.
6. Make sure your Expo plan/credits support the configured build and native Maestro jobs. During validation on November 8, Expo reported that this account's current plan does not permit Maestro jobs; this release path requires upgrading to a plan with that capability. Each platform's release includes a smoke-test build and a production build. No build was started during validation.

See [Expo programmatic access](https://docs.expo.dev/accounts/programmatic-access/).

## 4. Configure iOS signing and TestFlight

You need active Apple Developer membership and access to the app in App Store Connect. The current production bundle identifier is `com.myskoolclub.app`; the configured App Store Connect app ID is `6800048941`. Verify these refer to your app before continuing.

1. Open [App Store Connect](https://appstoreconnect.apple.com/) → Users and Access → Integrations → App Store Connect API.
2. If API access is not enabled, the Account Holder requests it first.
3. Under Team Keys, generate a key named `My Skool Club EAS Submit`. Select the App Manager role for the EAS submission setup. Apple team keys apply across the account's apps, so keep this key restricted to the publishing service.
4. Download the `.p8` private key once. Record the Key ID and Issuer ID in your password manager.
5. In a terminal from the repository root, run:

```bash
cd mobile
npx eas-cli@27.5.0 login
npx eas-cli@27.5.0 credentials --platform ios
```

6. Select the production build profile. Set up/reuse the iOS Distribution Certificate and App Store provisioning profile for `com.myskoolclub.app`. Complete any Apple login/2FA prompts locally.
7. In the EAS credential menu select App Store Connect API key / key for Expo Submit and upload the `.p8` key with its Key ID and Issuer ID. You can also use the project's Expo dashboard Credentials page for this association.
8. Ensure the key is assigned to this production app for non-interactive submissions. Both `production` builds and the `beta` submit profile must resolve the app's remote credentials.
9. In App Store Connect → the app → TestFlight, create an internal testing group, add your testers, and enable automatic distribution for that group. Uploading successfully does not mean Apple's processing is complete.

The submission key stays in Expo, not in the GitHub repo or `.env`. Existing optional `APPLE_*` secrets are used by the separate App Store status monitor, not required for this EAS-managed TestFlight upload path.

See [Apple's API-key steps](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/) and [Expo's iOS submission guide](https://docs.expo.dev/submit/ios/).

## 5. Configure Android signing and Google Play internal testing

You need a Google Play Developer account and the app record for `com.myskoolclub.app`.

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) and select the project you use for Play publishing. It can be separate from the application's Cloud Run project.
2. Enable the Google Play Android Developer API.
3. Open IAM & Admin → Service Accounts → Create service account. Name it `my-skool-club-play-submit`. It does not need project Owner/Editor roles for Play submission.
4. Open that service account → Keys → Add key → Create new key → JSON. Download and store it securely. If your organization prohibits service-account keys, follow your organization's publishing credential process instead.
5. Open [Google Play Console](https://play.google.com/console/) → Users and permissions → Invite new users. Use the service account's email from its JSON key.
6. Limit app access to My Skool Club. Grant permissions to view app information and release apps to testing tracks. Complete the invitation/save process. Use [Expo's current Play credential guide](https://docs.expo.dev/submit/android/) to confirm the permissions shown in your Play Console.
7. Open the Expo project's Credentials page → Android → `com.myskoolclub.app` → Service credentials → Google Service Account key for Expo Submit. Upload the JSON key and assign it to the app. Alternatively run:

```bash
npx eas-cli@27.5.0 credentials --platform android
```

8. Select the production profile. Set up/reuse the Android upload keystore, then configure the Google service account key for Play submissions. For an existing app, preserve its existing upload/signing identity.
9. In Play Console → the app → Testing → Internal testing, add testers or a tester list and obtain the opt-in link. Complete any required store/account declarations shown by Play Console.

The `beta` submission profile selects the internal track. It does not publish a public production release. Keep the Google JSON key in Expo's credential store and your password manager, not in GitHub or `.env`.

## 6. Validate the first native builds and store connections

While still in `mobile`, create an initial production build for each platform interactively. This resolves signing and account requirements that unattended jobs cannot answer:

```bash
npx eas-cli@27.5.0 build --platform ios --profile production
npx eas-cli@27.5.0 build --platform android --profile production
```

These commands create paid/credit-consuming builds according to your Expo plan. After each completes, record its build ID and perform one initial beta upload:

```bash
npx eas-cli@27.5.0 submit --platform ios --profile beta --id YOUR_IOS_BUILD_ID
npx eas-cli@27.5.0 submit --platform android --profile beta --id YOUR_ANDROID_BUILD_ID
```

Confirm the builds appear in TestFlight and Play internal testing. Build/submission success and store availability are different states.

## 7. Apply GitHub settings after the implementation is merged

Install and sign in to GitHub CLI locally using an administrator account:

```bash
brew install gh
gh auth login
```

From the repository root on the updated `main` branch:

```bash
bash scripts/configure-dependency-automation.sh --check
bash scripts/configure-dependency-automation.sh --apply
```

`--apply` enables native auto-merge and merged-branch deletion, creates the tracking label, and requires the six CI jobs, up-to-date branches, a current approval and resolved conversations on main. It refuses to run before the required main checks and secret names exist. It uses your local admin login for setup; the workflow token retains administration read-only access.

In Repository → Settings → Code security / Dependabot, verify alerts and security updates remain enabled. Their last audited state was enabled. Keep `ENABLE_AUTOMATIC_PRODUCTION_DEPLOY=true`; the backend and bundled frontend deploy through the existing Cloud Run pipeline.

## 8. Run dry runs, then activate

In GitHub → Actions, select the updated main branch:

1. Run Dependency remediation with `dry_run=true`, `scan_alerts=true`. Confirm it can read alerts, branch rules and PR state using the automation identity.
2. Run Mobile beta release with `dry_run=true`. Confirm the selected commit and planned platforms. This does not start EAS or store submissions.
3. Confirm Copilot can be assigned to one controlled issue and can produce an actual approving review on a test PR. A read-only dry run cannot prove these write operations or subscription entitlements.
4. Start one real Mobile beta release with `dry_run=false`. Each platform runs native public-auth Maestro smoke tests, builds the production archive, and submits that exact build to its beta destination.
5. After these checks, activate:

```bash
bash scripts/configure-dependency-automation.sh --enable
```

This sets `ENABLE_DEPENDENCY_AUTOMATION=true` and `ENABLE_MOBILE_BETA_RELEASE=true`. Automatic merges use the six current-head CI results and an actual approval. Remediation retries are bounded, and protected automation/deployment/credential changes remain maintainer-only.

To stop new automatic merges and beta releases:

```bash
bash scripts/configure-dependency-automation.sh --disable
```

## 9. Watch results and recover interrupted mobile attempts

- GitHub Actions → Dependency remediation shows tasks, review waits, failed permissions and merges. GitHub Actions → Cloud Run Deployment verifies staging, migrations and production.
- Mobile beta release starts after a successful main-branch Cloud Run deployment and only when mobile inputs differ from the previous beta release. The initial run has no baseline, so it plans both platforms.
- Expo → Workflows holds native build, Maestro and store-submission logs.
- GitHub prereleases named `mobile-beta-PLATFORM-SHA` record successful submissions; the EAS workflow JSON is retained as an Actions artifact. Store processing remains visible in TestFlight/Play Console.
- An unfinished attempt retains a draft prerelease to prevent duplicate paid builds/uploads. Inspect the associated EAS run first. If submission already succeeded, reconcile and publish the record; if it did not, delete the draft only after confirming no upload is in flight, then rerun. Do not delete store builds to resolve an automation retry.
- Rotate expiring tokens by replacing the matching Actions secret. Changing the automation user's GitHub identity requires migrating existing tracked issues so their trusted author still matches the new identity.

Two GitHub Actions secrets are required for this path: `DEPENDENCY_AUTOMATION_TOKEN` and `EXPO_TOKEN`. Apple and Google publishing keys and the platform signing credentials are managed through Expo.
