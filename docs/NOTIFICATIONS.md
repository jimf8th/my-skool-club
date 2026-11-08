# Deployment Notifications

The deployment pipeline emits notifications after each run so the application owner receives a clear outcome and can act on failures without reading the whole GitHub log set.

## Supported notification channels

- GitHub Actions run summary
- optional Slack webhook via `SLACK_WEBHOOK_URL`
- optional email status target via `ALERT_EMAIL_RECIPIENTS` (legacy fallback: `DEPLOY_NOTIFICATION_EMAIL`)

## Notification behavior

- The workflow always records the final deployment status.
- If Slack is configured, the workflow posts a concise deployment outcome to the configured webhook.
- If an email target is configured, the workflow publishes a plain-text deployment summary and includes the GitHub Actions run URL.
- On rollback, the workflow still sends a failure notification so the owner sees the incident immediately.

## Configuration requirements

The repo does not ship with valid production notification credentials. The actual owner notification flow must be configured in GitHub repository variables before the pipeline is activated in production.

Set the repository variable named `ALERT_EMAIL_RECIPIENTS` to a single comma-separated value in the format:

`jimf8th@gmail.com,eksamson24@gmail.com`

This centralized variable is the supported notification target for deployment and dependency workflow alerts. If the variable is not populated yet, the workflow logs the run URL instead of sending mail.
