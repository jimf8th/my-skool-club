# Automation health reporting

This repository includes the automation health summary generator and a scheduled workflow to produce a weekly operational summary.

## Files

- [.github/scripts/automation-health-summary.js](.github/scripts/automation-health-summary.js)
- [.github/workflows/operational-health.yml](.github/workflows/operational-health.yml)

## Purpose

The summary reports on:

- dependencies and vulnerability posture
- deployment counts and failures
- rollback activity
- mobile release status
- automation issues that require human attention

## Evidence policy

If data is unavailable, the summary should record it as unavailable rather than assuming success. In this workspace, live GitHub/Google Cloud/Apple data is not available, so the report is intentionally conservative and does not claim production telemetry that cannot be observed.
