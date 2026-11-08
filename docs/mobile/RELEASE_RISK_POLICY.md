# iOS Release Risk Policy

The repository reuses the deterministic risk model established in Phase 2 and applies it to release eligibility.

## Risk categories

- LOW: no relevant app or contract changes since the last successful release; skip allowed
- MEDIUM: the app itself, EAS config, or app metadata changed; release allowed only after full validation
- HIGH: API contract, shared library, backend, or release automation changes are present; policy review required before release

## Change detection rules

The release script inspects the git diff since the last successful mobile release. It treats the following as relevant:

- `mobile/**`
- `mobile/app.json`
- `mobile/eas.json`
- `mobile/package.json`
- `mobile/package-lock.json`
- `backend/**` for API or contract changes
- `frontend/**` when shared UI libraries or APIs affect the mobile app
- `.github/workflows/**` and `.github/scripts/**` when release automation itself changes

## Blocked release behavior

A release is blocked when:

- required tests do not run successfully
- required Apple credentials or Expo credentials are missing
- the build cannot be processed by Apple
- metadata or privacy declarations are incomplete
- a duplicate submission is detected

A blocked release must produce an actionable owner notification and stop without silent fallback.
