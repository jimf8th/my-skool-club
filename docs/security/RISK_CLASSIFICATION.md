# Risk Classification Policy

## Deterministic classification rules

Every dependency update is classified as LOW, MEDIUM, or HIGH according to the repository policy in `.github/security/dependency-risk-policy.yml`.

### LOW RISK

An update is LOW risk when all of the following are true:

- update type is patch
- the PR changes a single manifest or lockfile only
- there are no source-code changes outside dependency metadata
- the dependency is not security-sensitive
- the update does not change deployment or runtime configuration
- all mandatory tests pass

Examples:

- patch bump in `frontend/package-lock.json`
- a transitive patch update that leaves application code unchanged

### MEDIUM RISK

An update is MEDIUM risk when any of the following apply:

- minor-version update
- multiple related packages are updated in the same PR
- a shared library affects multiple application surfaces
- the compatibility impact is uncertain or test coverage is incomplete
- a dependency update requires a compatibility review

### HIGH RISK

An update is HIGH risk when any of the following apply:

- major-version update
- authentication, authorization, database, or cryptography libraries are involved
- deployment or runtime configuration changes are included
- application source code is modified outside dependency manifests
- security advisory severity is high or critical
- the risk is ambiguous or unknown

## Security severity vs. change risk

A critical advisory can require urgent security work, but the proposed fix may still be HIGH risk because the upgrade itself may be broad or compatibility-sensitive. Risk classification is based on the change itself, not only the advisory score.

## Auto-merge eligibility

Only LOW-risk dependency PRs are eligible for native GitHub auto-merge when all required checks pass and repository rules allow it.
