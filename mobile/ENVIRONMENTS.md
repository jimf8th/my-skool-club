# Mobile environments

The mobile application has three explicit variants. Test and production both
use the deployed production API and data, so test actions can modify real data.

| Environment | App name | iOS/Android identifier | API |
| --- | --- | --- | --- |
| dev | My Skool Club Dev | `com.myskoolclub.app.dev` | Local Spring Boot API |
| test | My Skool Club Test | `com.myskoolclub.app.test` | `https://myskoolclub.com/api` |
| prod | My Skool Club | `com.myskoolclub.app` | `https://myskoolclub.com/api` |

## Local development

From the repository root, one command starts PostgreSQL and MailHog in Docker,
Spring Boot on the host, and the dev Expo session:

```sh
./scripts/mobile-dev.sh
```

It defaults to Expo Go. To use the separately installed native dev client:

```sh
./scripts/mobile-dev.sh --dev-client --clear
```

The dev client derives the computer's LAN address from Expo/Metro, so a physical
device uses `http://<computer-ip>:8080/api`. A simulator fallback uses
`http://localhost:8080/api`.

## Local mobile against the deployed API

```sh
./scripts/mobile-test.sh
```

This launches a development bundle with the test app identity while forcing the
API to `https://myskoolclub.com/api`.

Use `./scripts/mobile-test.sh --dev-client --clear` for the installed test
variant. `./scripts/mobile-prod.sh` is also available for a local production
configuration check. Both test and prod commands verify the deployed health
endpoint before starting Expo and operate on real production data.

## EAS builds

Before the first cloud build, link this directory to the intended Expo project:

```sh
cd mobile
eas init
```

This account-level step writes `extra.eas.projectId`; it is intentionally not
guessed or created by repository configuration.

```sh
cd mobile
npm run build:dev
npm run build:test
npm run build:prod
```

There are also `build:dev:simulator` and `build:test:simulator` scripts for iOS
Simulator artifacts. `build:test:dev-client` creates a local-Metro test client
that still calls the deployed API. EAS maps the app profiles to its
`development`, `preview`, and `production` variable environments respectively.

The `ios:dev`, `ios:test`, `android:dev`, and `android:test` scripts cleanly
regenerate the ignored native directories before compiling. This is necessary
when switching variants because an existing native directory retains the prior
identifier.

```sh
npm run ios:dev
```

API URLs are public client configuration, not secrets. The application rejects
a test or production configuration that attempts to use any URL other than the
approved deployed endpoint.
