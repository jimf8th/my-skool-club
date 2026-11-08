# Security audit

## Current posture

The repo has a strong policy of conservative automation, but real production protection still depends on GitHub and cloud configuration outside the local repository.

## Review findings

- GitHub Actions permissions: scoped and minimal in the workflows; no broad default write permissions are used beyond needed tasks.
- OIDC trust: the deployment workflow uses `google-github-actions/auth` with `workload_identity_provider` and service account configuration; this is correct in principle, but the specific values are not present in this local workspace.
- Google Cloud IAM: required roles and values are not verifiable from the repo alone.
- Secrets handling: repository secrets are referenced by name only, with no production values committed to git.
- Third-party actions: actions are pinned to versioned release tags rather than immutable SHAs. This is acceptable but not ideal for stricter supply-chain policy; immutable SHAs should be adopted where practical.
- Pull-request trust boundaries: the workflows do not use `pull_request_target` for privileged actions. This reduces the risk of untrusted PRs gaining privileged access.
- Branch protection: not verifiable from this repository snapshot; it must be enforced in GitHub.
- AI-agent permissions: the remediation workflow requires human review approval semantics and does not bypass branch protection.
- Apple/Expo credentials: not available in the repo; live uploads remain disabled.

## Security conclusion

The repository is designed with safe-by-default controls, and untrusted pull requests are not allowed to access production secrets via privileged flows. Full production security hardening remains external to the repo and must be completed in the GitHub and cloud control planes.
