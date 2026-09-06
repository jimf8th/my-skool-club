# Maestro smoke tests

These flows run against an installed test build whose iOS/Android application ID
is `com.myskoolclub.app.test`. The test build calls the deployed production API.

## Prerequisites

1. Install the Maestro CLI.
2. Boot a simulator/emulator or connect a device.
3. Install a development or preview build of My Skool Club.
4. Start a backend that the installed build can reach. Authenticated flows require
   stable member and app-admin test accounts.

## Commands

The public flow does not need credentials:

```sh
npm run e2e:smoke:public
```

Run the member flow with a seeded, verified member:

```sh
E2E_MEMBER_EMAIL='member@example.com' \
E2E_MEMBER_PASSWORD='StrongPass1!' \
npm run e2e:smoke:member
```

Run the admin flow with an app administrator:

```sh
E2E_ADMIN_EMAIL='admin@example.com' \
E2E_ADMIN_PASSWORD='StrongPass1!' \
npm run e2e:smoke:admin
```

To run all flows, provide both credential pairs and use `npm run e2e:smoke`.
The smoke tests intentionally do not create, edit, or delete production data.
