'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { run, REQUIRED_JOBS, REVIEWER } = require('./dependency-automation');

function harness(overrides = {}) {
  const writes = [];
  const notes = [];
  const pr = { number: 1, node_id: 'PR_1', user: { login: 'dependabot[bot]' },
    head: { sha: 'head', ref: 'dependabot/example', repo: { full_name: 'owner/repo' } },
    base: { ref: 'main' }, mergeable: true, mergeable_state: 'clean', draft: false, requested_reviewers: [],
    ...overrides.pr };
  const api = name => Object.assign(() => {}, { kind: name });
  const write = name => async args => { writes.push([name, args]); return {data:{merged:true}}; };
  const protection = { enforce_admins: {enabled:true}, required_status_checks: {strict:true, contexts:REQUIRED_JOBS},
    required_pull_request_reviews: {dismiss_stale_reviews:true, required_approving_review_count:1},
    required_conversation_resolution:{enabled:true}, ...overrides.protection };
  const github = { rest: {
    users:{getAuthenticated:async()=>({data:{login:'automation-user'}})},
    repos:{get:async()=>({data:{default_branch:'main'}}),getBranch:async()=>({data:{commit:{sha:'main'}}}),getBranchProtection:async()=>({data:protection})},
    pulls:{list:api('pulls'),get:async()=>({data:pr}),listFiles:api('files'),listReviews:api('reviews'),merge:write('merge'),updateBranch:write('update-branch'),requestReviewers:write('review')},
    issues:{listForRepo:api('issues'),listComments:api('comments'),createComment:write('fix')},
    actions:{approveWorkflowRun:write('approve-ci'),listWorkflowRuns:api('runs'),listJobsForWorkflowRun:api('jobs')},
    git:{deleteRef:write('delete')},
  },
  graphql:async(query)=> query.startsWith('mutation') ? (writes.push(['review',{}]),{requestCopilotCodeReview:{success:true,failureReason:null}}) : ({repository:{pullRequest:{closingIssuesReferences:{nodes:[]},reviewThreads:{nodes:[],pageInfo:{hasNextPage:false}},...overrides.graph}}}),
  request:write('retry-deployment'),
  paginate:async (method,args) => method.kind === 'runs' && args.workflow_id === 'cloud-run-deploy.yml'
    ? (overrides.deployments || [{id:2,status:'completed',conclusion:'success'}]) : ({
    pulls:[pr], files:[{filename:'frontend/package-lock.json'}], issues:[], comments:[],
    reviews:[{id:1,state:'APPROVED',commit_id:'head',user:{login:REVIEWER,type:'Bot'}}],
    runs:[{id:1,name:'CI Tests',event:'pull_request',head_sha:'head',status:'completed',conclusion:'success'}],
    jobs:REQUIRED_JOBS.map(name=>({name,conclusion:'success'})),
    ...overrides.pages,
  }[method.kind]),
  };
  const core = { info: text=>notes.push(text), error:text=>notes.push(text), setFailed:text=>notes.push(`FAILED ${text}`),
    summary:{addHeading(){return this;},addRaw(){return this;},async write(){}} };
  return {github,core,context:{repo:{owner:'owner',repo:'repo'}},writes,notes};
}
test('reviewed and tested dependency head merges with an atomic SHA and branch cleanup', async()=>{
  const h=harness(); await run(h);
  assert.deepEqual(h.writes.map(w=>w[0]),['merge','delete']);
  assert.equal(h.writes[0][1].sha,'head');
  assert.equal(h.writes[1][1].ref,'heads/dependabot/example');
});
test('dry run makes no writes, including branch deletion',async()=>{
  const h=harness(); await run({...h,dryRun:true}); assert.equal(h.writes.length,0);
});
test('fork PR cannot reach any privileged operations',async()=>{
  const h=harness({pr:{head:{sha:'head',ref:'main',repo:{full_name:'attacker/repo'}}}});
  await run(h); assert.equal(h.writes.length,0);
});
test('unrelated Copilot PR is not treated as a dependency task',async()=>{
  const h=harness({pr:{user:{login:'copilot-swe-agent[bot]'}}});
  await run(h); assert.equal(h.writes.length,0);
});
test('renaming a protected workflow into a manifest cannot bypass policy',async()=>{
  const h=harness({pages:{files:[{filename:'frontend/package.json',previous_filename:'.github/workflows/ci-tests.yml'}]}});
  await run(h); assert.equal(h.writes.length,0);
});
test('without review, request a review and never merge',async()=>{
  const h=harness({pages:{reviews:[]}}); await run(h);
  assert.deepEqual(h.writes.map(w=>w[0]),['review']);
});
test('a failed test run invokes Copilot instead of merging',async()=>{
  const h=harness({pages:{runs:[{id:1,name:'CI Tests',event:'pull_request',head_sha:'head',status:'completed',conclusion:'failure'}]}});
  await run(h); assert.deepEqual(h.writes.map(w=>w[0]),['fix']);
});
test('authorized scoped CI is approved automatically without merging untested code',async()=>{
  const h=harness({pages:{runs:[{id:1,name:'CI Tests',event:'pull_request',head_sha:'head',status:'completed',conclusion:'action_required'}]}});
  await run(h);assert.deepEqual(h.writes.map(w=>w[0]),['approve-ci']);
});
test('unresolved review threads block merge',async()=>{
  const h=harness({graph:{reviewThreads:{nodes:[{isResolved:false}],pageInfo:{hasNextPage:false}}}});
  await run(h); assert.deepEqual(h.writes.map(w=>w[0]),['fix']);
});
test('same-head remediation requests are idempotent',async()=>{
  const h=harness({pages:{reviews:[],comments:[{user:{login:'automation-user'},body:'<!-- dependency-fix:head -->'}],runs:[{id:1,name:'CI Tests',event:'pull_request',head_sha:'head',status:'completed',conclusion:'failure'}]}});
  await run(h); assert.equal(h.writes.length,0);
});
test('behind-main branches are updated for fresh CI and never merged with stale tests',async()=>{
  const h=harness({pr:{mergeable_state:'behind'}}); await run(h); assert.deepEqual(h.writes.map(w=>w[0]),['update-branch']);
  assert.equal(h.writes[0][1].expected_head_sha,'head');
});
test('pending deployments prevent another merge',async()=>{
  const h=harness({deployments:[{id:2,status:'in_progress',conclusion:null}]}); await run(h); assert.equal(h.writes.length,0);
});
test('failed production deployment is retried without merging more code',async()=>{
  const h=harness({deployments:[{id:2,status:'completed',conclusion:'failure',run_attempt:1}]}); await run(h); assert.deepEqual(h.writes.map(w=>w[0]),['retry-deployment']);
});
test('deployment retry budget is bounded',async()=>{
  const h=harness({deployments:[{id:2,status:'completed',conclusion:'failure',run_attempt:3}]}); await run(h); assert.equal(h.writes.length,0);
});
test('admin bypass or disabled strict checks stop orchestration',async()=>{
  const h=harness({protection:{enforce_admins:{enabled:false}}});
  await assert.rejects(run(h),/strict checks/); assert.equal(h.writes.length,0);
});
for (const files of [
  [{filename:'mobile/package-lock.json'}],
  [{filename:'frontend/package.json'},{filename:'mobile/package.json'}],
  [{filename:'frontend/package.json',previous_filename:'mobile/package.json'}],
]) {
  test(`out-of-scope PR cannot request remediation, review, merge or deletion: ${JSON.stringify(files)}`,async()=>{
    const h=harness({pages:{files}}); await run(h); assert.equal(h.writes.length,0);
  });
}
test('mobile alerts do not create or assign Copilot tasks',async()=>{
  const h=harness({pages:{pulls:[]}});
  const paginate=h.github.paginate;
  h.github.paginate=async(method,args)=> typeof method === 'string' ? [{dependency:{manifest_path:'mobile/package-lock.json',package:{name:'axios'}}}] : paginate(method,args);
  await run({...h,scanAlerts:true});
  assert.equal(h.writes.length,0);
  assert.ok(h.notes.some(note=>note.includes('Open backend/frontend alerts: 0')));
});
