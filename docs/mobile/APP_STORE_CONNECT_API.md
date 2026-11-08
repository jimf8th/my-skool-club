# App Store Connect API contract

The automated iOS release flow uses the official App Store Connect API and the current App Store version lifecycle.

## Required credentials

The workflow expects the following credentials to exist in GitHub secrets:

- `APPLE_API_KEY_ID`
- `APPLE_ISSUER_ID`
- `APPLE_API_KEY`
- `ASC_APP_ID`
- `APP_STORE_VERSION_ID`

The App Store Connect API key is generated in App Store Connect and must be stored as a valid PEM-based API key. The key should never be checked into the repository.

## Supported API operations

The repo uses the supported App Store Connect version endpoints for:

- fetching the app by identifier
- listing or fetching App Store versions
- associating a processed build with a version
- creating or updating a review submission
- reading app review state
- reading release status after approval

The status monitor script in `.github/scripts/apple-store-status.js` executes the supported `/v1/apps/{appId}/appStoreVersions/{versionId}` read flow using the JWT-based App Store Connect token.

## Safety behavior

The automation will stop safely if:

- the required Apple credentials are missing
- the build is not yet processed
- the version metadata is incomplete
- a review submission is already pending or a duplicate attempt is detected
- the app is blocked by Apple metadata or compliance information

Do not bypass these validations with the assumption that upload means submission success.
