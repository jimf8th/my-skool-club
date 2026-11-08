# Deployment kill switch

## Purpose

The repository includes a deployment kill switch to prevent production rollout while still allowing normal validation, staging checks, and non-production quality gates to continue.

## Implementation

- Script: [.github/scripts/deployment-kill-switch.js](.github/scripts/deployment-kill-switch.js)
- Repo state file: [.github/production-kill-switch.json](.github/production-kill-switch.json)
- Workflow enforcement: [.github/workflows/cloud-run-deploy.yml](.github/workflows/cloud-run-deploy.yml)

## How to enable it

Set the repository variable `DEPLOYMENT_KILL_SWITCH` to `enabled`.

```bash
node .github/scripts/deployment-kill-switch.js --state enabled --mode set
```

This will write a JSON state file and the deployment workflow will exit before production rollout.

## How to disable it

Set the repository variable to `disabled` or run:

```bash
node .github/scripts/deployment-kill-switch.js --state disabled --mode set
```

Then re-run the deployment workflow only after a human review confirms the incident is resolved.

## Safety properties

- Prevents new automated production deployment
- Does not disable staging validation or CI execution
- Requires explicit human recovery before re-enabling automatic production deployment
