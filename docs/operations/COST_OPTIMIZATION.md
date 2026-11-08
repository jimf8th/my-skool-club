# Cost and performance optimization

## Observed waste and risk areas

- Duplicate test execution can occur when both local validation and CI run the same suites without a clear selection policy.
- Cloud Run staging and production runs can add cost when the environment is left active during idle periods.
- Scheduled synthetic monitor jobs should be kept at a conservative cadence; every additional check increases both execution cost and alert noise.
- Mobile EAS builds should remain gated behind a verified release decision to avoid unnecessary build usage.

## Recommendations

- Keep CI and deployment workflows scoped to the changed surface area when practical.
- Use the release-risk gate to avoid unnecessary monthly releases.
- Maintain conservative monitoring intervals rather than aggressive polling.
- Keep the deployment kill switch ready for incident use without reducing the required quality gates.

## Evidence note

Exact cloud billing numbers are not available in this workspace, so the repo documents the optimization opportunities without claiming actual spend values.
