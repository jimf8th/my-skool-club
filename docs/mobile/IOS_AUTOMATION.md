# iOS Automation Setup

## Required one-time setup

Before the automated monthly release workflow can build and submit to Apple, the following items must be configured in GitHub and Expo.

### GitHub variables

- `GCP_PROJECT_ID` (already used by the Cloud Run pipeline)
- `ENABLE_IOS_AUTOMATIC_RELEASE` set to `true` only after validation is complete
- `ASC_APP_ID` with the App Store Connect app identifier
- `EAS_PROJECT_ID` if the Expo project ID differs from the repo default
- `APP_STORE_VERSION_ID` for monitoring the active release
- `PUBLIC_BASE_URL` or staging backend URL if needed for test flows

### GitHub secrets

- `EXPO_TOKEN`
- `APPLE_API_KEY_ID`
- `APPLE_ISSUER_ID`
- `APPLE_API_KEY`
- `APP_STORE_CONNECT_API_KEY` (if retained in the workflow)
- `ALERT_EMAIL_RECIPIENTS` (single comma-separated owner list; legacy fallback `DEPLOY_NOTIFICATION_EMAIL`)
- `SLACK_WEBHOOK_URL`

### Apple configuration

- Apple Developer Program membership
- App Store Connect access for the release account
- valid App Store Connect API key generated for the app
- completed app metadata, screenshots, and privacy declarations
- production signing credentials for EAS

### Expo/EAS

The repo already contains a valid EAS project ID and a production profile in `mobile/eas.json`.

The production build uses:

```bash
cd mobile
npx eas build --platform ios --profile production --non-interactive --wait
```

This is intended to generate the exact production archive that is then submitted to App Store Connect and reviewed by Apple.

## Safe default behavior

The monthly workflow is intentionally default-disarmed. It will not submit live production builds until the release owner has configured the required secrets and explicitly enables the automatic release setting.
