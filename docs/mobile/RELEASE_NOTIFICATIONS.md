# Release Notifications

The iOS release workflow sends notifications for each meaningful lifecycle event.

## Covered events

- monthly release started
- release skipped because no relevant changes were found
- regression test failure
- build succeeded
- build failed
- App Store Connect upload succeeded
- Apple processing failed
- App Store review submitted
- review rejected or blocked
- Apple approval received
- app published
- unrecoverable automation error

## Notification channels

The workflow is designed to integrate with:

- GitHub Actions logs
- email via the configured owner notification secret
- optional Slack webhook for operational status

The app owner must receive a clear final outcome with the app version, Git commit, workflow link, App Store link, and next action if any.
