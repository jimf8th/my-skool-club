'use strict';

function enabled(value) {
  return value === true || value?.enabled === true;
}

function protectionReady(protection, requiredJobs) {
  const checks = protection.required_status_checks;
  const contexts = new Set([...(checks?.contexts || []), ...(checks?.checks || []).map(check => check.context)]);
  return enabled(protection.enforce_admins) && checks?.strict === true
    && requiredJobs.every(name => contexts.has(name))
    && protection.required_pull_request_reviews?.dismiss_stale_reviews === true
    && protection.required_pull_request_reviews.required_approving_review_count >= 1
    && enabled(protection.required_conversation_resolution);
}

module.exports = { enabled, protectionReady };
