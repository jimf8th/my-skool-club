# Release Recovery and Retry Policy

The iOS release system must be idempotent and fail safe.

## Retry boundaries

- EAS build retries are bounded by the workflow and require a new build only if the previous attempt failed before artifact creation.
- App Store submission is retries-safe only when the exact build and version remain unchanged.
- the duplicate-submission guard checks the persisted manifest before creating a new App Store review record.

## Recovery actions

When a release fails, the automation does the following:

1. captures the failure reason and current phase
2. preserves test and build artifacts
3. records the failed version in the manifest
4. notifies the owner with the exact action needed
5. stops without producing a new release candidate unless a manual recovery decision is made

## Situations requiring manual intervention

- expired App Store Connect API key
- invalid or missing Expo token
- failed Apple asset validation
- release metadata rejected by Apple
- app review blocked by compliance or privacy issues
- build number collision or invalid signing credentials

These cases never result in silent fallback or automatic version mutation.
