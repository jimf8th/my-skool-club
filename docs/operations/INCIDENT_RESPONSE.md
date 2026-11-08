# Incident response

## Immediate actions

1. Stop automated production rollout using the deployment kill switch in [.github/production-kill-switch.json](.github/production-kill-switch.json) or the repository variable `DEPLOYMENT_KILL_SWITCH`.
2. Review the most recent workflow run and deployment health check output.
3. Use the last stable Cloud Run revision to restore traffic if the health check fails.
4. Preserve logs and artifact metadata before making a corrective change.
5. Notify the application owner or designated reviewer through the configured notification channel.

## Recovery policy

- Do not automatically re-enable production deployment after an incident without an explicit human approval step.
- Leave the kill switch in `enabled` until the root cause is addressed and validation is complete.
- Re-run staging and health validation before re-enabling automated deployment.

## Manual controls

The repository includes a kill switch implementation at [.github/scripts/deployment-kill-switch.js](.github/scripts/deployment-kill-switch.js). Set the repo variable `DEPLOYMENT_KILL_SWITCH` to `enabled` to halt production deployment; switch it back to `disabled` only after a human review.
