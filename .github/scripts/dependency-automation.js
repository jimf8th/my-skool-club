'use strict';

// Execute only from the default branch, never from a PR checkout. No PR code is
// installed or executed in this job, which holds the automation user's token.
const { createHash } = require('node:crypto');
const { classifyRisk } = require('./classify-dependency-risk');
const REVIEWER = 'copilot-pull-request-reviewer[bot]';
const CODER = 'copilot-swe-agent[bot]';
const LABEL = 'dependency-automation';
const REQUIRED_JOBS = ['Backend unit and integration tests', 'Frontend unit and component tests',
  'Frontend Playwright browser tests', 'Mobile unit and component tests', 'Security and dependency checks', 'Automation policy tests'];

function reviewDecision(reviews, sha, author) {
  const latest = new Map();
  for (const review of [...reviews].sort((a, b) => a.id - b.id)) {
    if (review.state !== 'COMMENTED') latest.set(review.user.login, review);
  }
  const active = [...latest.values()];
  const blocked = active.some(review => review.state === 'CHANGES_REQUESTED');
  const approved = active.some(review => review.state === 'APPROVED' && review.commit_id === sha
    && review.user.login !== author && (review.user.login === REVIEWER || review.user.type === 'User'));
  return { approved: approved && !blocked, blocked };
}

function testsDecision(runs, jobs, head) {
  const latest = runs.filter(run => run.name === 'CI Tests' && run.event === 'pull_request'
    && run.head_sha === head).sort((a, b) => b.id - a.id)[0];
  if (!latest) return 'missing';
  if (latest.status !== 'completed') return 'pending';
  if (latest.conclusion !== 'success') return 'failure';
  if (!REQUIRED_JOBS.every(name => jobs.some(job => job.name === name && job.conclusion === 'success'))) return 'failure';
  return 'success';
}

function taskKey(manifest, name) {
  return createHash('sha256').update(`${manifest}:${name}`).digest('hex').slice(0, 20);
}

async function run({ github, context, core, dryRun = false, scanAlerts = false }) {
  const repo = context.repo;
  const fullName = `${repo.owner}/${repo.repo}`;
  const viewer = (await github.rest.users.getAuthenticated()).data.login;
  const repository = (await github.rest.repos.get(repo)).data;
  const main = repository.default_branch;
  const protection = (await github.rest.repos.getBranchProtection({ ...repo, branch: main })).data;
  const required = protection.required_status_checks;
  if (!protection.enforce_admins?.enabled || !required?.strict || !REQUIRED_JOBS.every(name => required.contexts?.includes(name))
      || !protection.required_pull_request_reviews?.dismiss_stale_reviews
      || protection.required_pull_request_reviews.required_approving_review_count < 1
      || !protection.required_conversation_resolution?.enabled) {
    throw new Error('Run configure-dependency-automation.sh --apply: strict checks, current approvals and conversation resolution must be enforced.');
  }
  const report = [];
  const record = text => { report.push(text); core.info(text); };
  const mutate = async (description, operation) => {
    record(`${dryRun ? 'DRY RUN: ' : ''}${description}`);
    return dryRun ? undefined : operation();
  };
  const issues = await github.paginate(github.rest.issues.listForRepo, { ...repo, state: 'all', labels: LABEL, per_page: 100 });
  const trustedIssues = issues.filter(issue => !issue.pull_request && issue.user.login === viewer);
  const pulls = await github.paginate(github.rest.pulls.list, { ...repo, state: 'open', base: main, per_page: 100 });

  async function fix(pr, comments, reason) {
    const previous = comments.filter(comment => comment.user.login === viewer && comment.body.includes('<!-- dependency-fix:'));
    if (previous.some(comment => comment.body.includes(`<!-- dependency-fix:${pr.head.sha} -->`))) return;
    if (previous.length >= 3) { record(`#${pr.number}: remediation limit reached; maintainer action required.`); return; }
    await mutate(`#${pr.number}: request Copilot remediation (${reason}).`, () => github.rest.issues.createComment({
      ...repo, issue_number: pr.number,
      body: `<!-- dependency-fix:${pr.head.sha} -->\n@copilot Fix the dependency compatibility/test or review failure on this branch. Use CI and unresolved review threads as diagnostics. Preserve security controls and business behavior. Do not change workflows, deployment/signing configuration, credentials, tests to weaken assertions, or coverage thresholds. Run backend, frontend and mobile regression tests. Resolve review feedback after implementing it. Keep the PR linked to its original dependency issue. Attempt ${previous.length + 1} of 3.`,
    }));
  }

  for (const item of pulls) {
    try {
      const pr = (await github.rest.pulls.get({ ...repo, pull_number: item.number })).data;
      if (pr.head.repo?.full_name !== fullName || pr.base.ref !== main) continue;
      const dependabot = pr.user.login === 'dependabot[bot]';
      const copilot = pr.user.login === CODER;
      if (!dependabot && !copilot) continue;
      const graph = await github.graphql(`query($owner:String!,$repo:String!,$number:Int!) {
        repository(owner:$owner,name:$repo) { pullRequest(number:$number) {
          closingIssuesReferences(first:100) { nodes { number } }
          reviewThreads(first:100) { nodes { isResolved } pageInfo { hasNextPage } }
        } }
      }`, { ...repo, number: pr.number });
      const details = graph.repository.pullRequest;
      if (copilot && !details.closingIssuesReferences.nodes.some(issue => trustedIssues.some(trusted => trusted.number === issue.number))) {
        record(`#${pr.number}: no trusted dependency task; skipping.`); continue;
      }
      const files = await github.paginate(github.rest.pulls.listFiles, { ...repo, pull_number: pr.number, per_page: 100 });
      const risk = classifyRisk({ files: files.flatMap(file => [file.filename, file.previous_filename].filter(Boolean)), ecosystem: 'unknown', updateType: 'unknown', packageNames: [], hasSourceChanges: false, changedOutsideManifests: false });
      if (risk.requiresMaintainer) { record(`#${pr.number}: maintainer review required for protected configuration.`); continue; }
      const comments = await github.paginate(github.rest.issues.listComments, { ...repo, issue_number: pr.number, per_page: 100 });
      const runs = await github.paginate(github.rest.actions.listWorkflowRuns, { ...repo, workflow_id: 'ci-tests.yml', head_sha: pr.head.sha, event: 'pull_request', per_page: 100 });
      const latest = [...runs].sort((a, b) => b.id - a.id)[0];
      if (latest?.status === 'action_required' || latest?.conclusion === 'action_required') { record(`#${pr.number}: GitHub requires maintainer approval of workflow execution.`); continue; }
      const jobs = latest?.conclusion === 'success'
        ? await github.paginate(github.rest.actions.listJobsForWorkflowRun, { ...repo, run_id: latest.id, filter: 'latest', per_page: 100 }) : [];
      const tests = testsDecision(runs, jobs, pr.head.sha);
      if (tests === 'failure') { await fix(pr, comments, 'tests failed'); continue; }
      if (tests !== 'success') { record(`#${pr.number}: waiting for current-head CI (${tests}).`); continue; }
      const reviews = await github.paginate(github.rest.pulls.listReviews, { ...repo, pull_number: pr.number, per_page: 100 });
      const review = reviewDecision(reviews, pr.head.sha, pr.user.login);
      const unresolved = details.reviewThreads.pageInfo.hasNextPage || details.reviewThreads.nodes.some(thread => !thread.isResolved);
      if (review.blocked || unresolved) { await fix(pr, comments, 'review feedback'); continue; }
      if (!review.approved) {
        const alreadyReviewed = reviews.some(r => r.user.login === REVIEWER && r.commit_id === pr.head.sha);
        if (alreadyReviewed) { record(`#${pr.number}: Copilot commented but did not approve; enable Copilot approvals or obtain maintainer approval.`); continue; }
        if (!pr.requested_reviewers.some(user => user.login === REVIEWER)) {
          await mutate(`#${pr.number}: request current-head Copilot review.`, () => github.rest.pulls.requestReviewers({ ...repo, pull_number: pr.number, reviewers: [REVIEWER] }));
        }
        continue;
      }
      if (pr.draft) {
        await mutate(`#${pr.number}: mark tested and approved draft ready.`, () => github.graphql(
          'mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{id}}}', { id: pr.node_id }));
        continue;
      }
      if (!pr.mergeable || pr.mergeable_state !== 'clean') {
        record(`#${pr.number}: merge state ${pr.mergeable_state}; waiting for a clean, current branch.`); continue;
      }
      const result = await mutate(`#${pr.number}: squash-merge reviewed, tested head ${pr.head.sha}.`, () => github.rest.pulls.merge({ ...repo, pull_number: pr.number, sha: pr.head.sha, merge_method: 'squash' }));
      if (result && !result.data.merged) throw new Error('GitHub declined merge');
      // A user token emits main's push event. Never dispatch a duplicate release.
      if (result?.data.merged && pr.head.ref !== main) {
        try { await github.rest.git.deleteRef({ ...repo, ref: `heads/${pr.head.ref}` }); }
        catch (error) { if (error.status !== 422 && error.status !== 404) throw error; }
      }
      if (!dryRun) break;
    } catch (error) {
      core.error(`PR #${item.number}: API operation failed (${error.status || error.name}); check setup and permissions.`);
      core.setFailed(`Dependency automation failed for PR #${item.number}.`);
    }
  }

  if (scanAlerts) {
    const alerts = await github.paginate('GET /repos/{owner}/{repo}/dependabot/alerts', { ...repo, state: 'open', per_page: 100 });
    const groups = new Map();
    for (const alert of alerts) {
      const { manifest_path: manifest, package: { name } } = alert.dependency;
      const key = taskKey(manifest, name);
      if (!groups.has(key)) groups.set(key, { manifest, name, alerts: [] });
      groups.get(key).alerts.push(alert);
    }
    record(`Open alerts: ${alerts.length}; affected dependency groups: ${groups.size}.`);
    let started = 0;
    const activeTasks = trustedIssues.filter(issue => issue.state === 'open');
    // A failed assignment must not leave a task permanently stranded.
    for (const issue of activeTasks.filter(issue => !issue.assignees.some(user => user.login === CODER))) {
      await mutate(`Assign existing dependency task #${issue.number} to Copilot.`, () => github.rest.issues.addAssignees({ ...repo,
        issue_number: issue.number, assignees: [CODER],
        agent_assignment: { target_repo: fullName, base_branch: main, custom_instructions: `Fix issue #${issue.number}; link your PR with Closes #${issue.number}.` },
      }));
    }
    for (const [key, group] of groups) {
      const marker = `<!-- dependency-task:${key} -->`;
      const existing = trustedIssues.filter(issue => issue.body?.includes(marker));
      if (existing.some(issue => issue.state === 'open')) continue;
      if (activeTasks.length + started >= 2 || existing.length >= 3) continue;
      if (pulls.some(pr => pr.user.login === 'dependabot[bot]' && pr.title.toLowerCase().includes(group.name.toLowerCase()))) continue;
      if (!group.alerts.some(alert => alert.security_vulnerability.first_patched_version)) {
        record(`${group.manifest}: ${group.name} has no patched version; maintainer mitigation required.`); continue;
      }
      const created = await mutate(`Create Copilot task for ${group.manifest}: ${group.name}.`, () => github.rest.issues.create({ ...repo,
        title: `Fix vulnerable dependency ${group.name} in ${group.manifest}`,
        body: `${marker}\nFix current Dependabot alerts with the smallest compatible dependency/application changes.\n\n${group.alerts.map(alert => `- ${alert.security_advisory.ghsa_id} (${alert.security_advisory.severity}): ${alert.html_url}`).join('\n')}\n\nWork from ${main}. Reuse an existing dependency PR where appropriate. Run all backend, frontend and mobile tests. Do not weaken tests, auth or security controls. Do not modify automation, deployment, signing or credential files. Link your PR using Closes #ISSUE_NUMBER. Request review after completing the fix.`,
        labels: [LABEL],
      }));
      if (created) await github.rest.issues.addAssignees({ ...repo, issue_number: created.data.number, assignees: [CODER],
        agent_assignment: { target_repo: fullName, base_branch: main, custom_instructions: `Fix issue #${created.data.number}; link your PR with Closes #${created.data.number}.` },
      });
      started += 1;
    }
    for (const issue of trustedIssues.filter(issue => issue.state === 'closed')) {
      const key = issue.body?.match(/<!-- dependency-task:([a-f0-9]+) -->/)?.[1];
      if (key && groups.has(key)) record(`Issue #${issue.number}: advisory remains open after closure; follow-up required.`);
    }
  }
  await core.summary.addHeading('Dependency automation').addRaw(report.join('\n\n') || 'No eligible updates.').write();
}

module.exports = { run, reviewDecision, testsDecision, taskKey, REQUIRED_JOBS, REVIEWER, CODER };
