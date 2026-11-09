'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { protectionReady } = require('./dependency-protection');
const jobs = ['backend', 'frontend'];
const base = {enforce_admins:{enabled:true},required_status_checks:{strict:true,contexts:jobs},required_pull_request_reviews:{dismiss_stale_reviews:true,required_approving_review_count:1},required_conversation_resolution:{enabled:true}};
test('accepts the REST response contexts shape',()=>assert.equal(protectionReady(base,jobs),true));
test('accepts checks-only responses and boolean flags',()=>assert.equal(protectionReady({...base,enforce_admins:true,required_conversation_resolution:true,required_status_checks:{strict:true,checks:jobs.map(context=>({context,app_id:15368}))}},jobs),true));
test('does not accept missing checks or weaker branch rules',()=>{
  for (const changed of [{enforce_admins:false},{required_conversation_resolution:false},{required_status_checks:{strict:false,contexts:jobs}},{required_status_checks:{strict:true,checks:[{context:'backend'}]}},{required_pull_request_reviews:{dismiss_stale_reviews:false,required_approving_review_count:1}},{required_pull_request_reviews:{dismiss_stale_reviews:true,required_approving_review_count:0}}]) {
    assert.equal(protectionReady({...base,...changed},jobs),false);
  }
});
