# iOS Release Architecture

## Repository findings

The Expo mobile app is configured in the repository under the `mobile/` directory and currently uses:

- Expo SDK: `~54.0.37`
- React Native: `0.81.5`
- Package manager: `npm` with `package-lock.json`
- App entry: `expo-router/entry`
- Bundle identifier: `com.myskoolclub.app`
- App Store Connect app ID: `6800048941`
- Expo project ID: `543ebf4b-fa14-4d36-a40e-a90fb85c6538`
- iOS app version: `2.2.0`
- iOS build number: `1`

The app uses EAS configuration in `mobile/eas.json` and application metadata in `mobile/app.json`. The production profile is already configured for `autoIncrement` and a production environment, and it is the correct starting point for the monthly release automation.

## Runtime and release topology

- Mobile app: Expo + React Native
- Authentication: Firebase + Google Sign-In + Apple sign-in + secure store/session tokens
- Backend integration: app reads from `https://myskoolclub.com/api`
- CI path: `mobile/` has Jest tests and Maestro smoke flows under `mobile/e2e/maestro/`
- Release control plane: GitHub Actions + Expo EAS + Apple App Store Connect
- Safety rule: live release automation is off unless GitHub secrets and variables are configured and the project owner explicitly enables automatic production submission

## Existing test coverage

The mobile app already includes the required regression layers:

- Jest unit and integration tests via `npm test`
- coverage collection via `npm run test:ci`
- Maestro smoke tests under `mobile/e2e/maestro/`
- app auth and session flows backed by the app environment configuration in `mobile/config/environments.js`

## Release gate model

The automation is intentionally conservative:

1. inspect the repo for relevant mobile or shared changes since the last successful release
2. decide whether a release is necessary
3. run mandatory regression tests
4. create the production iOS build only after validation
5. upload the exact validated build to App Store Connect
6. create or update the App Store version and review submission with Apple-supported APIs
7. monitor review and publication status
8. notify the owner of every milestone and failure

This avoids silent bypasses and keeps the repo aligned with the nonproduction validation gates already established in Phases 1–3.
