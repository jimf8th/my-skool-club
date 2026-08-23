# My Skool Club — App Store submission checklist

Use this checklist for the first iPhone release. The app is intended for users age 13 and older and is not a Kids Category app.

## Build and URLs

- Bundle ID: `com.myskoolclub.app`
- Support URL: `https://myskoolclub.com/support`
- Privacy policy URL: `https://myskoolclub.com/privacy`
- Terms: `https://myskoolclub.com/terms`
- Community Standards: `https://myskoolclub.com/community-standards`
- Production API used by the app: `https://myskoolclub.com/api`
- Build: `cd mobile && eas build --platform ios --profile production`
- Upload to TestFlight: `cd mobile && eas submit --platform ios --profile production`

Do not submit until all five public URLs return `200` over HTTPS and the production backend has run Flyway through migration V17.

## App Review information

Create a dedicated, email-verified review account in production. Add it as an approved member of a school and club with sample announcements, events, invoices, and inventory. Provide its email and password in App Review Information. Never use a personal administrator account.

Suggested review notes:

> My Skool Club is a school and club coordination app for users age 13+. Sign in with the review account to access the seeded school and club. Content can be reported using the flag/Report action on announcements and events. Reports are reviewed by app administrators, who can remove content and suspend authors. Account deletion is available at Profile → Delete Account. Optional receipt scanning requires explicit consent before a receipt is sent to OpenAI; manual invoice entry remains available.

## App Privacy answers

Select “Yes, we collect data” and declare these as linked to the user and used only for App Functionality unless actual production practices change:

- Contact Info: Name, Email Address
- Financial Info: Other Financial Info
- User Content: Photos or Videos, Other User Content
- Identifiers: User ID
- Diagnostics: Other Diagnostic Data

Select no tracking, no third-party advertising, no developer advertising/marketing, and no data broker sharing. Receipt photos are sent only after explicit consent to support optional AI receipt extraction. Keep App Store Connect answers synchronized with the published privacy policy and the built `PrivacyInfo.xcprivacy`.

## Content safety operations

- `APP_ADMIN` is the only role allowed to open `/moderation`, decide reports, remove/disable reported content, suspend authors, or restore access.
- New reports create an in-app notification for enabled app administrators and send a best-effort alert to `support@myskoolclub.com`.
- Check the moderation queue and support mailbox every business day. Treat threats, exploitation, self-harm, or exposed personal information as urgent.
- Preserve the report snapshot for audit, but do not forward reported content through ordinary email.
- If anyone is in immediate danger, follow applicable emergency and legal escalation procedures.

## Manual pre-submission checks

- Register, receive the production verification email from `support@myskoolclub.com`, verify, sign in, reset password, and sign in again.
- Confirm a direct threat and repeated-link spam are rejected before posting.
- Report an announcement and an event from a non-author account.
- Confirm an app admin receives the alert, opens the queue, removes the content, suspends the author, and can restore the author.
- Confirm the suspended user's existing JWT stops working immediately.
- Delete a test account in the app and confirm it can no longer sign in.
- Deny camera/photo permission and confirm manual invoice entry still works.
- Complete one consented receipt scan with a non-sensitive test receipt and verify extracted fields can be edited before saving.
- Test on the smallest and largest supported iPhones, with VoiceOver text labels and large Dynamic Type.
- Supply current iPhone screenshots, app description, keywords, category, copyright, review contact, and the review account in App Store Connect.
