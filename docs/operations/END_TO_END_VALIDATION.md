# End-to-end validation

This document records the actual validation statements that can be proven within the current repository and local workstation environment.

## Validation sequence

1. Dependency update detection
   - Dependabot is configured in [.github/dependabot.yml](.github/dependabot.yml).
   - Status: implemented, not executed here because GitHub repo settings are outside this local checkout.

2. Risk classification
   - Risk logic exists in [.github/scripts/classify-dependency-risk.js](.github/scripts/classify-dependency-risk.js).
   - Verified locally: `node .github/scripts/classify-dependency-risk.js --files "pom.xml" --package-names "spring-security" --ecosystem "maven" --update-type "patch"` returned a classification and `autoMergeEligible: false` for a sensitive package.

3. Regression execution
   - Backend: `cd backend && ./mvnw test -q` exited 0.
   - Frontend: `cd frontend && npm run test` exited 0; 9 files / 15 tests passed.
   - Mobile: `cd mobile && npm test -- --runInBand` exited 0; 27 suites / 304 tests passed.

4. Deployment automation
   - Staging and production deployment logic exists in [.github/workflows/cloud-run-deploy.yml](.github/workflows/cloud-run-deploy.yml).
   - Production rollout is gated by the kill switch and by required repo variables/secrets.
   - Live production execution is intentionally blocked in this environment because the required Cloud credentials are not configured.

5. Mobile release automation
   - Monthly release and risk detection exist in [.github/workflows/ios-monthly-release.yml](.github/workflows/ios-monthly-release.yml).
   - A release is blocked until Apple/Expo credentials are present; the workflow is safe by default.

## Required safety checks used

- Production deploy cannot proceed when the repository variable `DEPLOYMENT_KILL_SWITCH` is set to `enabled`.
- Cloud Run deployment workflow now runs a pre-flight check against [.github/scripts/deployment-kill-switch.js](.github/scripts/deployment-kill-switch.js).
- No destructive production actions are performed in this workspace.

## Operational conclusion

The validation flow is implemented and the core repository gate checks are passing. The remaining live deployment and release steps require external cloud, Apple, and GitHub configuration and therefore remain environment-blocked instead of verified production-ready.
