#!/usr/bin/env bash
set -euo pipefail

# Uses your local administrator login to configure settings. It never copies
# your local credential into Actions or reads any secret value.
AUTOMATION_REPOSITORY="jimf8th/my-skool-club"
MODE="${1:---check}"
case "$MODE" in --check|--apply|--enable|--disable) ;; *) echo 'Usage: bash scripts/configure-dependency-automation.sh [--check|--apply|--enable|--disable]'; exit 2 ;; esac
command -v gh >/dev/null || { echo 'Install GitHub CLI with brew install gh, then gh auth login.'; exit 1; }
gh auth status >/dev/null
if [[ "$MODE" == --disable ]]; then
  gh variable set ENABLE_DEPENDENCY_AUTOMATION --repo "$AUTOMATION_REPOSITORY" --body false
  gh variable set ENABLE_MOBILE_BETA_RELEASE --repo "$AUTOMATION_REPOSITORY" --body false
  echo 'New dependency merges and mobile releases are disabled. In-progress runs are unchanged.'
  exit 0
fi
TASK_TEMP="$(mktemp -d)"
trap 'rm -rf "$TASK_TEMP"' EXIT
gh api "repos/$AUTOMATION_REPOSITORY" > "$TASK_TEMP/repo.json"
gh secret list --repo "$AUTOMATION_REPOSITORY" --json name > "$TASK_TEMP/secrets.json"
gh api "repos/$AUTOMATION_REPOSITORY/actions/workflows/ci-tests.yml/runs?branch=main&event=push&per_page=1" > "$TASK_TEMP/ci.json"
gh api "repos/$AUTOMATION_REPOSITORY/commits/main/check-runs?per_page=100" > "$TASK_TEMP/checks.json"
node - "$TASK_TEMP" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const dir = process.argv[2];
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name)));
const secrets = new Set(read('secrets.json').map(s => s.name));
const required = require(process.cwd() + '/.github/scripts/dependency-automation').REQUIRED_JOBS;
for (const name of ['DEPENDENCY_AUTOMATION_TOKEN', 'EXPO_TOKEN']) {
  if (!secrets.has(name)) throw new Error(`Add repository Actions secret ${name} first. See docs/security/DEPENDENCY_AUTOMATION_SETUP.md.`);
}
const run = read('ci.json').workflow_runs[0];
if (run?.conclusion !== 'success') throw new Error('The latest main CI run must pass before setup.');
const checks = read('checks.json').check_runs;
const protectedChecks = required.map(context => {
  const check = checks.find(c => c.name === context && c.conclusion === 'success' && c.head_sha === run.head_sha);
  if (!check) throw new Error(`Missing successful main check ${context}. Merge and validate the automation implementation first.`);
  return {context, app_id:check.app.id};
});
fs.writeFileSync(path.join(dir, 'protection.json'), JSON.stringify({
  required_status_checks:{strict:true, checks:protectedChecks}, enforce_admins:true,
  required_pull_request_reviews:{dismiss_stale_reviews:true, require_code_owner_reviews:false, required_approving_review_count:1, require_last_push_approval:true},
  restrictions:null, required_conversation_resolution:true, allow_force_pushes:false, allow_deletions:false,
}));
console.log('Required secret names and six passing CI checks are present. Expo signing and Copilot entitlement still need their dry runs.');
NODE
if [[ "$MODE" == --apply ]]; then
  gh api --method PATCH "repos/$AUTOMATION_REPOSITORY" -F allow_auto_merge=true -F delete_branch_on_merge=true >/dev/null
  gh api --method PUT "repos/$AUTOMATION_REPOSITORY/branches/main/protection" --input "$TASK_TEMP/protection.json" >/dev/null
  gh label create dependency-automation --repo "$AUTOMATION_REPOSITORY" --description 'Tracked dependency remediation task' --color '0366d6' --force
  echo 'Required checks and reviews are enforced. Run both dry runs before --enable.'
elif [[ "$MODE" == --enable ]]; then
  gh api "repos/$AUTOMATION_REPOSITORY/branches/main/protection" > "$TASK_TEMP/current-protection.json"
  node - "$TASK_TEMP/current-protection.json" <<'NODE'
const p = require(process.argv[2]);
if (!p.required_status_checks?.strict || !p.required_pull_request_reviews?.dismiss_stale_reviews || !p.required_conversation_resolution?.enabled) throw new Error('Run --apply first.');
NODE
  gh variable set ENABLE_DEPENDENCY_AUTOMATION --repo "$AUTOMATION_REPOSITORY" --body true
  gh variable set ENABLE_MOBILE_BETA_RELEASE --repo "$AUTOMATION_REPOSITORY" --body true
  echo 'Automatic dependency processing and beta releases enabled. Monitor Actions and EAS.'
else
  echo 'Check completed. --apply configures branch protection; --enable activates automation after dry runs.'
fi
