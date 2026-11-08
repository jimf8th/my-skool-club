# Rollback Strategy

The project is designed to fail safe and restore the last known-good Cloud Run revision whenever the health or smoke checks fail after a production deployment.

## Trigger conditions

A rollback is initiated when one of the following happens:

- `/api/health` returns an error after deployment
- the staging verification fails before production rollout
- the application does not become healthy within the retry window

## Rollback mechanics

The deployment job calculates the previous revision of the production service and shifts traffic back to it:

```bash
gcloud run revisions list \
  --service="my-skool-club-app" \
  --region="us-central1" \
  --format='value(metadata.name)' \
  --sort-by='~metadata.creationTimestamp' \
  --limit=2
```

Then it issues:

```bash
gcloud run services update-traffic "my-skool-club-app" \
  --region="us-central1" \
  --to-revisions="PREVIOUS_REVISION=100"
```

This keeps the rollback compatible with Cloud Run’s revision-based traffic routing model while preserving the service’s private database and VPC configuration.

## Operational expectations

- The previous revision is never deleted automatically during the initial rollback step.
- Rollback is treated as a deployment failure and is surfaced through the workflow output and owner notifications.
- If no previous revision exists, the workflow exits as failed and requires manual intervention.
- A failed rollback also leaves an artifact record in the workflow logs for incident review.
