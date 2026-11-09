'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyRisk } = require('./classify-dependency-risk');
const { reviewDecision, testsDecision, taskKey, REQUIRED_JOBS, REVIEWER, filesInScope, ALERT_MANIFESTS, isCopilotCoder, issueAlertsResolved, outdatedMachineThread } = require('./dependency-automation');

const classify = files => classifyRisk({ files, ecosystem: 'npm', updateType: 'patch', packageNames: ['lodash'], hasCriticalSeverity: false, hasSourceChanges: false, changedOutsideManifests: false });
test('a normal frontend patch can be low risk', () => assert.equal(classify(['frontend/package.json', 'frontend/package-lock.json']).classification, 'LOW'));
for (const file of ['.github/workflows/cloud-run-deploy.yml', 'Dockerfile', 'scripts/deploy.sh', 'mobile/eas.json', 'mobile/app.config.js', '.env.production', 'AGENTS.md']) {
  test(`protected surface cannot be disguised by a package patch: ${file}`, () => {
    const result = classify(['frontend/package.json', file]);
    assert.equal(result.classification, 'HIGH');
    assert.equal(result.requiresMaintainer, true);
    assert.equal(result.autoMergeEligible, false);
  });
}
test('unknown YAML is never a dependency manifest', () => assert.equal(classify(['mobile/something.yaml']).autoMergeEligible, false));
test('empty file lists cannot merge', () => assert.equal(classify([]).requiresMaintainer, true));
test('high severity cannot downgrade to medium', () => assert.equal(classifyRisk({ files: ['frontend/package.json'], ecosystem: 'npm', updateType: 'minor', packageNames: ['lodash'], hasCriticalSeverity: true }).classification, 'HIGH'));

const approval = (overrides = {}) => ({ id: 1, user: { login: REVIEWER, type: 'Bot' }, state: 'APPROVED', commit_id: 'head', ...overrides });
test('actual current-head Copilot approval is accepted', () => assert.equal(reviewDecision([approval()], 'head', 'dependabot[bot]').approved, true));
test('a comment or a stale approval is insufficient', () => {
  assert.equal(reviewDecision([approval({ state: 'COMMENTED' })], 'head', 'author').approved, false);
  assert.equal(reviewDecision([approval()], 'new-head', 'author').approved, false);
});
test('dismissal overrides old approval', () => assert.equal(reviewDecision([approval(), approval({ id: 2, state: 'DISMISSED' })], 'head', 'author').approved, false));
test('changes requested are not erased by comments', () => assert.equal(reviewDecision([approval({ state: 'CHANGES_REQUESTED' }), approval({ id: 2, state: 'COMMENTED' })], 'head', 'author').blocked, true));
test('authors cannot approve themselves', () => assert.equal(reviewDecision([approval({ user: { login: 'author', type: 'User' } })], 'head', 'author').approved, false));
test('another bot cannot provide an approval', () => assert.equal(reviewDecision([approval({ user: { login: 'some-bot', type: 'Bot' } })], 'head', 'author').approved, false));
test('REST Copilot bot aliases are recognized without trusting a user account',()=>{
  assert.equal(isCopilotCoder({login:'Copilot',type:'Bot'}),true);
  assert.equal(isCopilotCoder({login:'Copilot',type:'User'}),false);
  assert.equal(isCopilotCoder({login:'copilot-swe-agent[bot]',type:'Bot'}),true);
});
test('missing and deleted actor metadata fails closed',()=>{
  for (const actor of [null,undefined,{}, {type:'Bot'}, {type:'Bot',login:null}]) assert.equal(isCopilotCoder(actor),false);
  assert.equal(reviewDecision([null,{user:null,state:'APPROVED',commit_id:'head',isCopilotCodeReview:true}], 'head','author').approved,false);
});
test('missing authors cannot hide blocking reviews',()=>{
  assert.equal(reviewDecision([approval(),{user:null,state:'CHANGES_REQUESTED'}],'head','author').approved,false);
  assert.equal(reviewDecision([approval(),{user:null,state:'CHANGES_REQUESTED'}],'head','author').blocked,true);
  assert.equal(reviewDecision([approval(),{user:null,state:'DISMISSED'}],'head','author').approved,true);
});
test('the display alias requires GitHub review provenance, even if the author alias matches',()=>{
  const review=approval({user:{login:'Copilot',type:'Bot'}});
  assert.equal(reviewDecision([review],'head','author').approved,false);
  assert.equal(reviewDecision([{...review,isCopilotCodeReview:true}],'head','Copilot').approved,true);
});

const run = { id: 1, name: 'CI Tests', event: 'pull_request', status: 'completed', conclusion: 'success', head_sha: 'head' };
const jobs = REQUIRED_JOBS.map(name => ({ name, conclusion: 'success' }));
test('all required jobs must pass on the exact PR head', () => {
  assert.equal(testsDecision([run], jobs, 'head'), 'success');
  assert.equal(testsDecision([run], jobs, 'other'), 'missing');
  assert.equal(testsDecision([run], jobs.slice(1), 'head'), 'failure');
  assert.equal(testsDecision([{ ...run, conclusion: 'failure' }], jobs, 'head'), 'failure');
});
test('newer failed or running CI cannot be hidden by earlier success', () => {
  assert.equal(testsDecision([run, { ...run, id: 2, conclusion: 'failure' }], jobs, 'head'), 'failure');
  assert.equal(testsDecision([run, { ...run, id: 2, status: 'in_progress' }], jobs, 'head'), 'pending');
});
test('task identity groups advisories per manifest/package', () => {
  assert.equal(taskKey('mobile/package-lock.json', 'axios'), taskKey('mobile/package-lock.json', 'axios'));
  assert.notEqual(taskKey('mobile/package-lock.json', 'axios'), taskKey('frontend/package-lock.json', 'axios'));
});
test('a later advisory gets its own remediation budget',()=>{
  assert.notEqual(taskKey('frontend/package-lock.json','axios',[1]),taskKey('frontend/package-lock.json','axios',[2]));
  assert.equal(taskKey('frontend/package-lock.json','axios',[2,1]),taskKey('frontend/package-lock.json','axios',[1,2]));
});
test('a task is not resolved while any linked advisory remains open',()=>{
  const issue={body:'https://github.com/owner/repo/security/dependabot/10 https://github.com/owner/repo/security/dependabot/11'};
  assert.equal(issueAlertsResolved(issue,new Set([11])),false);
  assert.equal(issueAlertsResolved(issue,new Set()),true);
  assert.equal(issueAlertsResolved({body:'No verified advisory links'},new Set()),false);
});
test('only fully inspected outdated machine-only threads can retire',()=>{
  const thread={isResolved:false,isOutdated:true,comments:{nodes:[{author:{__typename:'Bot',login:'copilot-pull-request-reviewer'},pullRequestReview:{isCopilotCodeReview:true,commit:{oid:'old'}}}],pageInfo:{hasNextPage:false}}};
  assert.equal(outdatedMachineThread(thread,'new'),true);
  assert.equal(outdatedMachineThread({...thread,isOutdated:false},'new'),false);
  assert.equal(outdatedMachineThread(thread,'old'),false);
  assert.equal(outdatedMachineThread({...thread,comments:{...thread.comments,pageInfo:{hasNextPage:true}}},'new'),false);
  assert.equal(outdatedMachineThread({...thread,comments:{...thread.comments,nodes:[{pullRequestReview:{isCopilotCodeReview:false,commit:{oid:'old'}}}]}},'new'),false);
  assert.equal(outdatedMachineThread(null,'new'),false);
  assert.equal(outdatedMachineThread({...thread,comments:{...thread.comments,nodes:[null]}},'new'),false);
  const humanReply={author:{__typename:'User',login:'maintainer'},pullRequestReview:{isCopilotCodeReview:true,commit:{oid:'old'}}};
  assert.equal(outdatedMachineThread({...thread,comments:{...thread.comments,nodes:[...thread.comments.nodes,humanReply]}},'new'),false);
});
test('only backend and frontend manifests are eligible for alert remediation', () => {
  assert.equal(ALERT_MANIFESTS.has('backend/pom.xml'), true);
  assert.equal(ALERT_MANIFESTS.has('frontend/package-lock.json'), true);
  assert.equal(ALERT_MANIFESTS.has('mobile/package-lock.json'), false);
});
test('all changed and previous file paths must stay within web application scope', () => {
  assert.equal(filesInScope(['backend/pom.xml', 'frontend/src/App.jsx']), true);
  for (const files of [[], ['mobile/package.json'], ['backend/pom.xml', 'mobile/src/App.js'], ['Dockerfile'], ['.github/workflows/ci-tests.yml']]) {
    assert.equal(filesInScope(files), false);
  }
});
