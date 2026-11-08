# Phase audit

This repository contains the automation required for Phases 1–5, but several capabilities remain conditional on GitHub, Google Cloud, Apple, and Expo configuration. The repo should be treated as operationally prepared for validation and safe-by-default deployment, not as fully production-ready without the required secrets and repository settings.

## Status matrix

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 – testing | Implemented and partially verified | Backend, frontend, and mobile test gates exist in [.github/workflows/ci-tests.yml](.github/workflows/ci-tests.yml). |
| Phase 2 – dependency automation | Implemented with safeguards | Dependabot and validation workflows exist, but full auto-merge and security updates depend on repo settings. |
| Phase 3 – Cloud Run deployment | Partially implemented | Staging and production workflows exist and are gated by policy, but live Cloud Run credentials are not available in this workspace. |
| Phase 4 – monthly iOS release | Partially implemented | Release detection and EAS integration exist, but actual Apple/App Store submissions remain blocked by missing credentials. |
| Phase 5 – AI remediation | Implemented with human-review gates | The workflow exists and is intentionally conservative; it does not assume Copilot automation is supported. |

## Phase-by-phase assessment

### Phase 1 – Automated testing

- Implemented: yes
- Verified operational: yes for backend, frontend, and mobile test suites in this workspace
- Evidence:
  - backend run: `cd backend && ./mvnw test -q` exited 0
  - frontend run: `cd frontend && npm run test` exited 0 with 9 test files and 15 tests passing
  - mobile run: `cd mobile && npm test -- --runInBand` exited 0 with 27 suites and 304 tests passing
- Missing: none at the repo level for local execution; browser-based E2E is defined but not executed here because external browser dependencies and production access are not configured.

### Phase 2 – Dependency automation

- Implemented: yes
- Verified operational: partial
- Evidence: [.github/dependabot.yml](.github/dependabot.yml), [.github/workflows/dependency-validation.yml](.github/workflows/dependency-validation.yml), [.github/workflows/dependency-remediation.yml](.github/workflows/dependency-remediation.yml), and [.github/scripts/classify-dependency-risk.js](.github/scripts/classify-dependency-risk.js) all exist.
- Blocked: real GitHub auto-merge, repository rules, and security notifications need repository settings.

### Phase 3 – Cloud Run deployment

- Implemented: yes
- Verified operational: partial
- Evidence: [.github/workflows/cloud-run-deploy.yml](.github/workflows/cloud-run-deploy.yml) includes staging and production gates.
- Missing/blocked: actual Google Cloud OIDC, service account, and Secret Manager configuration are not present in this workspace, so no live deployment can be claimed.

### Phase 4 – Monthly iOS release

- Implemented: yes
- Verified operational: partial
- Evidence: [.github/workflows/ios-monthly-release.yml](.github/workflows/ios-monthly-release.yml) and [.github/scripts/ios-release-risk.js](.github/scripts/ios-release-risk.js) exist.
- Missing/blocked: App Store Connect credentials, Expo tokens, and Apple API keys are required for live submission.

### Phase 5 – AI remediation

- Implemented: yes
- Verified operational: limited to policy-safe automation
- Evidence: [.github/workflows/dependency-remediation.yml](.github/workflows/dependency-remediation.yml) and [.github/scripts/ai-remediation-eligibility.js](.github/scripts/ai-remediation-eligibility.js) exist.
- Blocked: actual Copilot coding-agent support is optional and must be enabled in GitHub; the workflow intentionally does not bypass approval gates.

## Conclusion

The repository demonstrates solid automation scaffolding and policy-safe gating. It is not fully production-ready because the environment still requires external secrets, guardrails, and repository settings to be configured for real deployment and release execution.
