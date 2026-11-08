# Phase 4 Validation Plan

## Validation checklist

The iOS release automation is considered ready for live App Store activity only after all of the following are complete:

1. the monthly release workflow runs on the configured schedule and detects the first Saturday window
2. the skip-if-no-relevant-changes mechanism is verified
3. the mobile test suite passes in CI
4. EAS production build creation succeeds with real Expo credentials
5. the build ID is captured and archived in the release manifest
6. App Store Connect upload succeeds against a valid Apple account
7. the processed build is associated with the correct App Store version
8. the App Review submission is created with supported Apple API calls
9. the automatic release option is verified after approval
10. the status monitor sees transitions from processing to approved or rejected states
11. notifications are sent for both success and failure states
12. duplicate submission protection prevents repeated reviews

## Safety gates

- live App Store review submission is disabled unless the owner explicitly enables automatic release
- all Apple and Expo credentials are externalized to GitHub secrets
- no live customer data is used in mobile or App Store testing
- test runs occur against isolated staging or mock environments

## Execution status

This repository contains the implementation and validation scaffolding, but the live Apple/Expo subscription features require remote secrets and account configuration that are not available in this local workspace. The automation therefore remains safe by default until those one-time setup steps are completed.
