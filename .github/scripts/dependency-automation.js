'use strict';

// Execute only from the default branch, never from a PR checkout. No PR code is
// installed or executed in this job, which holds the automation user's token.
const { createHash } = require('node:crypto');
const { classifyRisk } = require('./classify-dependency-risk');
const { protectionReady } = require('./dependency-protection');
const REVIEWER = 'copilot-pull-request-reviewer[bot]';
const CODER = 'copilot-swe-agent[bot]';
const isCopilotCoder = user => user?.login === CODER || (user?.type === 'Bot' && user.login.toLowerCase() === 'copilot');
const isCopilotReview = review => review.user.login === REVIEWER || review.isCopilotCodeReview === true;
const LABEL = 'dependency-automation';
const SCOPE_MARKER = '<!-- dependency-scope:backend-frontend -->';
const ALERT_MANIFESTS = new Set(['backend/pom.xml', 'frontend/package.json', 'frontend/package-lock.json']);
function filesInScope(files) {
  return files.length > 0 && files.every(file => /^(backend|frontend)\//.test(file));
}
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
    && (review.user.login !== author || review.isCopilotCodeReview === true)
    && (isCopilotReview(review) || review.user.type === 'User'));
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

function taskKey(manifest, name, advisoryIds = []) {
  return createHash('sha256').update(`${manifest}:${name}:${[...advisoryIds].sort().join(',')}`).digest('hex').slice(0, 20);
}

async function run({ github, context, core, dryRun = false, scanAlerts = false }) {
  const repo = context.repo;
  const fullName = `${repo.owner}/${repo.repo}`;
  const viewer = (await github.rest.users.getAuthenticated()).data.login;
  const repository = (await github.rest.repos.get(repo)).data;
  const main = repository.default_branch;
  const protection = (await github.rest.repos.getBranchProtection({ ...repo, branch: main })).data;
  if (!protectionReady(protection, REQUIRED_JOBS)) {
    throw new Error('Run configure-dependency-automation.sh --apply: strict checks, current approvals and conversation resolution must be enforced.');
  }
  const report = [];
  const record = text => { report.push(text); core.info(text); };
  const mutate = async (description, operation) => {
    record(`${dryRun ? 'DRY RUN: ' : ''}${description}`);
    return dryRun ? undefined : operation();
  };
  const issues = await github.paginate(github.rest.issues.listForRepo, { ...repo, state: 'all', labels: LABEL, per_page: 100 });
  const trustedIssues = issues.filter(issue => !issue.pull_request && issue.user.login === viewer
    && issue.body?.includes(SCOPE_MARKER));
  const pulls = await github.paginate(github.rest.pulls.list, { ...repo, state: 'open', base: main, per_page: 100 });
  const mainSha = (await github.rest.repos.getBranch({ ...repo, branch: main })).data.commit.sha;
  const deployments = await github.paginate(github.rest.actions.listWorkflowRuns, {
    ...repo, workflow_id:'cloud-run-deploy.yml', head_sha:mainSha, event:'push', per_page:100,
  });
  const deployment = [...deployments].sort((a,b)=>b.id-a.id)[0];
  const deploymentReady = deployment?.status === 'completed' && deployment.conclusion === 'success';
  if (!deploymentReady) {
    record(`Main ${mainSha}: deployment ${deployment?.conclusion || deployment?.status || 'pending'}; new merges wait for production verification.`);
    if (deployment?.status === 'completed' && ['failure','timed_out'].includes(deployment.conclusion) && (deployment.run_attempt || 1) < 3) {
      await mutate(`Retry failed deployment jobs for main ${mainSha}.`, () => github.request(
        'POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs', {...repo,run_id:deployment.id}));
    }
  }

  async function fix(pr, comments, reason) {
    const previous = comments.filter(comment => comment.user.login === viewer && comment.body.includes('<!-- dependency-fix:'));
    if (previous.some(comment => comment.body.includes(`<!-- dependency-fix:${pr.head.sha} -->`))) return;
    if (previous.length >= 3) { record(`#${pr.number}: remediation limit reached; maintainer action required.`); return; }
    await mutate(`#${pr.number}: request Copilot remediation (${reason}).`, () => github.rest.issues.createComment({
      ...repo, issue_number: pr.number,
      body: `<!-- dependency-fix:${pr.head.sha} -->\n@copilot Fix the dependency compatibility/test or review failure on this branch. Limit all changes to backend/ and frontend/. Use CI and unresolved review threads as diagnostics. Preserve security controls and business behavior. Do not change mobile code, workflows, deployment configuration, credentials, tests to weaken assertions, or coverage thresholds. Run backend and frontend regression tests. Resolve review feedback after implementing it. Keep the PR linked to its original dependency issue. Attempt ${previous.length + 1} of 3.`,
    }));
  }

  for (const item of pulls) {
    try {
      const pr = (await github.rest.pulls.get({ ...repo, pull_number: item.number })).data;
      if (pr.head.repo?.full_name !== fullName || pr.base.ref !== main) continue;
      const dependabot = pr.user.login === 'dependabot[bot]';
      const copilot = isCopilotCoder(pr.user);
      if (!dependabot && !copilot) continue;
      const graph = await github.graphql(`query($owner:String!,$repo:String!,$number:Int!) {
        repository(owner:$owner,name:$repo) { pullRequest(number:$number) {
          closingIssuesReferences(first:100) { nodes { number } }
          reviews(last:100) { nodes { fullDatabaseId isCopilotCodeReview } }
          reviewThreads(first:100) { nodes { isResolved } pageInfo { hasNextPage } }
        } }
      }`, { ...repo, number: pr.number });
      const details = graph.repository.pullRequest;
      if (copilot && !details.closingIssuesReferences.nodes.some(issue => trustedIssues.some(trusted => trusted.number === issue.number))) {
        record(`#${pr.number}: no trusted dependency task; skipping.`); continue;
      }
      const files = await github.paginate(github.rest.pulls.listFiles, { ...repo, pull_number: pr.number, per_page: 100 });
      if (!filesInScope(files.flatMap(file => [file.filename, file.previous_filename].filter(Boolean)))) {
        record(`#${pr.number}: outside backend/frontend scope; skipping.`); continue;
      }
      const risk = classifyRisk({ files: files.flatMap(file => [file.filename, file.previous_filename].filter(Boolean)), ecosystem: 'unknown', updateType: 'unknown', packageNames: [], hasSourceChanges: false, changedOutsideManifests: false });
      if (risk.requiresMaintainer) { record(`#${pr.number}: maintainer review required for protected configuration.`); continue; }
      const comments = await github.paginate(github.rest.issues.listComments, { ...repo, issue_number: pr.number, per_page: 100 });
      if (pr.mergeable_state === 'behind') {
        await mutate(`#${pr.number}: update branch against current main for fresh tests and review.`, () => github.rest.pulls.updateBranch({
          ...repo,pull_number:pr.number,expected_head_sha:pr.head.sha,
        }));
        continue;
      }
      if (pr.mergeable_state === 'dirty') { await fix(pr,comments,'merge conflict with current main'); continue; }
      const runs = await github.paginate(github.rest.actions.listWorkflowRuns, { ...repo, workflow_id: 'ci-tests.yml', head_sha: pr.head.sha, event: 'pull_request', per_page: 100 });
      const latest = [...runs].sort((a, b) => b.id - a.id)[0];
      if (latest?.status === 'action_required' || latest?.conclusion === 'action_required') {
        // GitHub's approval API rejects Copilot runs. The repository policy
        // must allow them natively; never pretend this endpoint can approve it.
        record(`#${pr.number}: configure Copilot Cloud agent > Policies > Require approval for workflow runs = off.`);
        core.setFailed('Copilot workflow approval policy blocks unattended CI.');
        continue;
      }
      const jobs = latest?.conclusion === 'success'
        ? await github.paginate(github.rest.actions.listJobsForWorkflowRun, { ...repo, run_id: latest.id, filter: 'latest', per_page: 100 }) : [];
      const tests = testsDecision(runs, jobs, pr.head.sha);
      if (tests === 'failure') { await fix(pr, comments, 'tests failed'); continue; }
      if (tests !== 'success') { record(`#${pr.number}: waiting for current-head CI (${tests}).`); continue; }
      if (pr.draft) {
        // Complete CI before requesting approval; reviewers need a ready PR.
        // Ready status grants no merge permission: approval and SHA gates follow.
        await mutate(`#${pr.number}: mark tested draft ready for review.`, () => github.graphql(
          'mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{id}}}', { id: pr.node_id }));
        continue;
      }
      const reviews = await github.paginate(github.rest.pulls.listReviews, { ...repo, pull_number: pr.number, per_page: 100 });
      const provenReviewIds = new Set((details.reviews?.nodes || []).filter(review=>review.isCopilotCodeReview).map(review=>String(review.fullDatabaseId)));
      for (const review of reviews) review.isCopilotCodeReview = provenReviewIds.has(String(review.id));
      const review = reviewDecision(reviews, pr.head.sha, pr.user.login);
      const unresolved = details.reviewThreads.pageInfo.hasNextPage || details.reviewThreads.nodes.some(thread => !thread.isResolved);
      if (review.blocked || unresolved) { await fix(pr, comments, 'review feedback'); continue; }
      if (!review.approved) {
        const alreadyReviewed = reviews.some(r => isCopilotReview(r) && r.commit_id === pr.head.sha);
        const incomplete = reviews.some(r => isCopilotReview(r) && r.commit_id === pr.head.sha && /unable to complete|model policy|plan restrictions/i.test(r.body || ''));
        if (alreadyReviewed && !incomplete) { record(`#${pr.number}: Copilot did not approve; approval settings or review findings block merging.`); continue; }
        if (!pr.requested_reviewers.some(user => user.login === REVIEWER)) {
          const attempts = reviews.filter(r => isCopilotReview(r) && r.commit_id === pr.head.sha).length;
          if (attempts >= 3) { record(`#${pr.number}: Copilot review could not complete after three attempts; holding merge.`); continue; }
          const result = await mutate(`#${pr.number}: request current-head Copilot review.`, () => github.graphql(
            'mutation($id:ID!){requestCopilotCodeReview(input:{pullRequestId:$id,reviewEffort:LITE}){success failureReason}}', { id: pr.node_id }));
          if (result && !result.requestCopilotCodeReview.success && result.requestCopilotCodeReview.failureReason !== 'REQUEST_CONFLICT') {
            throw new Error(`Copilot review rejected: ${result.requestCopilotCodeReview.failureReason}`);
          }
        }
        continue;
      }
      if (!pr.mergeable || pr.mergeable_state !== 'clean') {
        record(`#${pr.number}: merge state ${pr.mergeable_state}; waiting for a clean, current branch.`); continue;
      }
      if (!deploymentReady) continue;
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
    const allAlerts = await github.paginate('GET /repos/{owner}/{repo}/dependabot/alerts', { ...repo, state: 'open', per_page: 100 });
    const alerts = allAlerts.filter(alert => ALERT_MANIFESTS.has(alert.dependency.manifest_path));
    const groups = new Map();
    for (const alert of alerts) {
      const { manifest_path: manifest, package: { name } } = alert.dependency;
      const key = taskKey(manifest, name);
      if (!groups.has(key)) groups.set(key, { manifest, name, alerts: [] });
      groups.get(key).alerts.push(alert);
    }
    record(`Open backend/frontend alerts: ${alerts.length}; affected dependency groups: ${groups.size}. Other manifests are outside this automation's scope.`);
    let started = 0;
    const activeTasks = trustedIssues.filter(issue => issue.state === 'open');
    // A failed assignment must not leave a task permanently stranded.
    for (const issue of activeTasks.filter(issue => !issue.assignees.some(isCopilotCoder))) {
      await mutate(`Assign existing dependency task #${issue.number} to Copilot.`, () => github.rest.issues.addAssignees({ ...repo,
        issue_number: issue.number, assignees: [CODER],
        agent_assignment: { target_repo: fullName, base_branch: main, custom_instructions: `Fix issue #${issue.number}; link your PR with Closes #${issue.number}.` },
      }));
    }
    const activeKeys = new Set();
    const severityRank = {critical:0, high:1, medium:2, low:3};
    const rankedGroups = [...groups.values()].sort((a,b) => Math.min(...a.alerts.map(alert=>severityRank[alert.security_advisory.severity] ?? 4)) - Math.min(...b.alerts.map(alert=>severityRank[alert.security_advisory.severity] ?? 4)));
    for (const group of rankedGroups) {
      const key = taskKey(group.manifest, group.name, group.alerts.map(alert => alert.number || alert.security_advisory.ghsa_id));
      activeKeys.add(key);
      const marker = `<!-- dependency-task:${key} -->`;
      const existing = trustedIssues.filter(issue => issue.body?.includes(marker));
      if (existing.some(issue => issue.state === 'open')) continue;
      if (activeTasks.length + started >= 2 || existing.length >= 3) continue;
      if (pulls.some(pr => pr.user.login === 'dependabot[bot]' && pr.title.toLowerCase().includes(group.name.toLowerCase()))) continue;
      const created = await mutate(`Create Copilot task for ${group.manifest}: ${group.name}.`, () => github.rest.issues.create({ ...repo,
        title: `Fix vulnerable dependency ${group.name} in ${group.manifest}`,
        body: `${marker}\n${SCOPE_MARKER}\nFix current Dependabot alerts with the smallest compatible dependency/application changes in backend/ and frontend/ only.\n\n${group.alerts.map(alert => `- ${alert.security_advisory.ghsa_id} (${alert.security_advisory.severity}): ${alert.html_url}`).join('\n')}\n\nWork from ${main}. Reuse an existing dependency PR where appropriate. Run backend and frontend tests. Do not change mobile code or weaken tests, auth or security controls. Do not modify automation, deployment or credential files. Link your PR using Closes #ISSUE_NUMBER. Request review after completing the fix.`,
        labels: [LABEL],
      }));
      if (created) await github.rest.issues.addAssignees({ ...repo, issue_number: created.data.number, assignees: [CODER],
        agent_assignment: { target_repo: fullName, base_branch: main, custom_instructions: `Fix issue #${created.data.number}; link your PR with Closes #${created.data.number}.` },
      });
      started += 1;
    }
    for (const issue of trustedIssues.filter(issue => issue.state === 'closed')) {
      const key = issue.body?.match(/<!-- dependency-task:([a-f0-9]+) -->/)?.[1];
      if (key && activeKeys.has(key)) record(`Issue #${issue.number}: advisory remains open after closure; follow-up required.`);
    }
  }
  await core.summary.addHeading('Dependency automation').addRaw(report.join('\n\n') || 'No eligible updates.').write();
}

module.exports = { run, reviewDecision, testsDecision, taskKey, REQUIRED_JOBS, REVIEWER, CODER, filesInScope, ALERT_MANIFESTS, isCopilotCoder };
