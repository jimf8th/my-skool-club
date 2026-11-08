# My Skool Club App Review recording runbook

This runbook produces the physical-device recording requested under App Store
Review Guideline 2.1. Follow it in order. Do not send simulator footage to
Apple.

## What is automated and what is not

- The flows in `mobile/e2e/maestro/app-review` rehearse the presentation on an
  iOS Simulator. They are intentionally read-only and can use the test build
  connected to the production API.
- The final recording is performed manually on a physical iPhone using the
  production TestFlight build. Maestro currently does not support running local
  iOS flows on physical devices.
- iOS permission prompts, the camera/photo picker, emailed verification codes,
  and account deletion are manual checkpoints.

## Stage 1 — create dedicated production review data

Do this at least one day before recording. Do not use personal accounts or real
student data.

From the repository root, preview the exact production fixture without changing
anything:

```sh
./scripts/seed-app-review-production.sh --plan
```

Then load it. The command validates the production project and Cloud SQL
resources, prompts for one shared password without echoing it, and requires the
typed production confirmation:

```sh
./scripts/seed-app-review-production.sh
```

The loader creates and verifies these account states:

| Recording role | Required state |
| --- | --- |
| Member | Approved school member and approved member of the sample club |
| School admin | Administrator of the sample school |
| Club admin | Administrator of the sample club; can manage invoices and inventory |
| App admin | Application administrator |
| Pending school member | Pending school request available to the school admin |
| Pending club member | Approved school member with a pending club request |
| Rejected school member | Rejected school state and request-again path |
| Rejected club member | Approved school member with rejected club state |
| Deletion account | Verified, unaffiliated account with no deletion blockers |

Use one shared sample school and club. Before recording, confirm they contain:

- At least two announcements written by someone other than the member account.
- At least two future events written by someone other than the member account.
- One draft, submitted, approved, paid, and cancelled invoice.
- At least three inventory items, including one checked-out item.
- At least two approved club members and one pending membership request.

Rerun the loader after any rehearsal that approves requests, submits reports, or
deletes the disposable account. The refresh is idempotent and restores the
starting state.

Store the credentials in a password manager. Never add them to this repository.

## Stage 2 — automated preflight

From the repository root, verify all production endpoints:

```sh
for url in \
  https://myskoolclub.com/ \
  https://myskoolclub.com/support \
  https://myskoolclub.com/privacy \
  https://myskoolclub.com/terms \
  https://myskoolclub.com/community-standards \
  https://myskoolclub.com/api/health
do
  curl -fsS -L --max-time 20 -o /dev/null "$url" || exit 1
done
```

Run the mobile tests:

```sh
cd mobile
npm test -- --runInBand
```

Do not begin recording unless both commands pass.

## Stage 3 — simulator rehearsal

This stage is optional for Apple but required before the physical recording.

Install Maestro on the Mac if it is not already installed:

```sh
brew tap mobile-dev-inc/tap
brew install mobile-dev-inc/tap/maestro
maestro --version
```

Start the test build on an iOS Simulator. The test build uses the production API
but has the separate bundle ID `com.myskoolclub.app.test`:

```sh
cd mobile
npm run ios:test
```

Wait until the native build succeeds and **My Skool Club Test** opens on the
simulator. Keep that terminal running if Expo starts Metro. Then, from a second
terminal at the repository root, run the guarded command that optionally
refreshes the production fixture, runs the preflight, executes every Maestro
role, and records the booted simulator:

```sh
# Optional: inspect the complete plan without contacting production.
./scripts/record-app-review-simulator.sh --plan

# Seed production review data and record all simulator flows.
./scripts/record-app-review-simulator.sh --seed-production
```

The command prompts once for the shared review password and still requires the
typed production confirmation. It writes an H.264 rehearsal video under
`artifacts/`. Exactly one iOS Simulator must be booted, and the test bundle
`com.myskoolclub.app.test` must already be installed. Use `--output FILE` to
choose a different destination or `--skip-tests` only when the tests were run
separately immediately beforehand.

In another terminal, run each rehearsal separately. The runner prompts for
credentials without echoing passwords:

```sh
cd mobile
./e2e/maestro/app-review/run-rehearsal.sh public
./e2e/maestro/app-review/run-rehearsal.sh member
./e2e/maestro/app-review/run-rehearsal.sh school-admin
./e2e/maestro/app-review/run-rehearsal.sh club-admin
./e2e/maestro/app-review/run-rehearsal.sh app-admin
```

The rehearsal deliberately opens and closes forms instead of submitting them.
Repeat it until every screen appears promptly and without errors.

## Stage 4 — prepare the physical iPhone

1. Use a physical iPhone running the latest available public iOS release.
2. Record its exact model and iOS version for App Review Notes.
3. Install the production build from TestFlight. Confirm the app name is **My
   Skool Club**, not **My Skool Club Test** or **My Skool Club Dev**.
4. Perform one private dry run of the entire script below.
5. Delete and reinstall the TestFlight app after the dry run so camera and photo
   permission prompts can be shown again. Do not open it after reinstalling.
6. Put a non-sensitive sample receipt in the photo library and keep a printed
   copy available for the camera flow.
7. Turn on Do Not Disturb, close personal applications, and disable notification
   previews. Keep Wi-Fi enabled.
8. Have the registration email inbox open on a second device. Never switch to a
   personal mailbox in the recording.
9. Place the review credentials in a private reference visible only to the
   person operating the phone.

## Stage 5 — start recording

1. Confirm My Skool Club is fully closed.
2. Return to the iPhone Home Screen.
3. Open Control Center and start Screen Recording. Leave the microphone off
   unless narration is planned.
4. Wait for the three-second countdown.
5. Close Control Center and immediately tap the **My Skool Club** icon.

The submitted video must begin with this app launch. Do not begin in Settings or
inside an already-open app.

## Stage 6 — continuous physical-device presentation

Move at a readable pace. Pause for roughly one second after each destination
loads. Do not expose passwords; the password fields mask their contents.

### A. Public experience, registration, verification, and deletion

1. On the public home screen, briefly scroll through the app description and
   return to the top.
2. Tap **Create Account**.
3. Register a disposable 13+ account using a unique email address that you can
   access. Accept the Terms, Privacy Policy, and Community Standards.
4. Read the six-digit verification code from the second device and enter it on
   the iPhone. Tap **Verify and sign in**.
5. Show the new member Home screen.
6. Open **Profile → Delete Account**.
7. Enter the disposable account password, type `DELETE`, and tap **Delete
   Account**. Confirm that the app returns to the signed-out experience.

### B. Approved member experience and content safety

1. Tap **Sign In** and sign in with the member review account.
2. On **Home**, show the sample school and Quick Actions.
3. Tap **Announcements** and open the report action for an announcement created
   by another user.
4. Choose **Spam or scam**, enter `App Review demonstration`, and tap **Submit
   Report**. Show the confirmation.
5. Open **Events**. Show upcoming events and change one RSVP to **Going**.
6. Open the report action on a different event, show the available safety
   reasons, and cancel without submitting a second report.
7. Open **Schools**, view the sample school, and show approved membership,
   events, and announcements.
8. Open **Clubs**, view the sample club, and show the club dashboard, members,
   invoices, and inventory. Do not modify accounting or inventory under the
   member account.
9. Open **Profile** and briefly show Terms, Privacy, Community Standards,
   support, and the in-app Delete Account entry point.
10. Tap **Log Out**.

### C. School administrator experience

1. Sign in with the school-admin review account.
2. Open **Schools → [sample school]**.
3. Show the school administrators, **Review Pending Requests**, **View Approved
   Members**, **View Events**, and **View Announcements** entry points.
4. Open the new-announcement form, enter demonstration text, then return without
   posting. This proves the form without adding unnecessary production content.
5. Open the new-event form, enter demonstration text, then return without
   saving.
6. Open **Clubs**, show that the school administrator can manage the school’s
   club structure, then log out.

### D. Club administrator, invoices, receipt consent, and inventory

1. Sign in with the club-admin review account.
2. Open **Clubs → [sample club]**.
3. Show **Club Dashboard**, **Review Pending Requests**, and **View Club
   Members**.
4. Open **Invoices** and show invoices in several lifecycle states.
5. Tap **New Invoice → Scan Receipt → Take Photo**. Accept the camera permission,
   photograph the non-sensitive printed receipt, and show the **Share receipt
   with OpenAI?** consent prompt. Tap **Cancel** the first time.
6. Tap **Scan Receipt → Choose from Library**. Accept photo-library permission,
   choose the prepared receipt, then tap **Agree & Scan**.
7. Show the extracted editable fields. Do not save unless the result is clean and
   contains no personal data; returning without saving is acceptable.
8. Explain in App Review Notes that manual invoice entry remains available when
   permission or consent is denied and that invoices do not process payments.
9. Open **Inventory**. Show checked-in and checked-out items and the add/checkout
   entry points. Return without changing inventory.
10. Log out.

### E. Application administrator experience

1. Sign in with the app-admin review account.
2. Show the **App Administrator** Home dashboard.
3. Open **Manage Schools** and the **Add School** form, then cancel.
4. Open **Manage Clubs**, select the sample school, open **Add Club**, then
   cancel.
5. Open **Members** and show the available membership-management entry points.
6. Open **Events** and show the administrator’s event access.
7. Open **Profile**, show the administrator badge, and log out.

The mobile app accepts member reports. The separate authenticated web moderation
console is used by platform staff to review reports, remove content, and suspend
authors. Do not mix Safari footage into the primary app recording. If Apple asks
to see the enforcement console, provide it as a separately labeled supplemental
recording.

## Stage 7 — stop and validate the recording

1. Stop recording after the final signed-out screen is visible.
2. Trim only the Control Center footage at the beginning and end. Do not splice
   successful takes together or hide failures.
3. Watch the entire result with sound on and off.
4. Confirm that the video shows the initial app launch, stays readable, contains
   no personal data, and has no crash, red error overlay, stalled spinner, or
   notification banner.
5. Copy the video to the Mac and inspect it:

```sh
ffprobe -v error \
  -show_entries format=duration,size:stream=codec_name,width,height \
  -of default=noprint_wrappers=1 \
  /absolute/path/to/My-Skool-Club-App-Review.mov
```

6. Attach the recording to the App Store Connect Resolution Center response. If
   an external link is necessary, use an HTTPS link that requires no account,
   password, access request, or expiring token.

## Abort and restart conditions

Restart the recording if any of these occur:

- The app shown is a development/test build rather than the production
  TestFlight build.
- A real student name, personal notification, personal receipt, or private
  credential becomes visible.
- A required account cannot sign in or expected sample data is missing.
- A permission prompt does not appear.
- The app crashes, shows an error overlay, or remains stalled.
- The recording did not begin with launching My Skool Club.
