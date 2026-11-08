#!/usr/bin/env node

const fs = require('fs');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const value = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[i + 1] : 'true';
    args[key] = value;
    if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) i += 1;
  }
  return args;
}

function normalizeRisk(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (['LOW', 'MEDIUM', 'HIGH'].includes(normalized)) return normalized;
  return 'UNKNOWN';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const prNumber = String(args['pr-number'] || process.env.PR_NUMBER || '').trim();
  const workflowConclusion = String(args['workflow-conclusion'] || process.env.WORKFLOW_CONCLUSION || 'failure').trim().toLowerCase();
  const riskClassification = normalizeRisk(args['risk-classification'] || process.env.RISK_CLASSIFICATION || 'UNKNOWN');
  const dependencyEcosystem = String(args['dependency-ecosystem'] || process.env.DEPENDENCY_ECOSYSTEM || 'maven').trim().toLowerCase();

  let eligible = 'false';
  let remediationComplexity = 'human-review';
  let reason = 'Dependency validation failed but the update is blocked for manual review.';

  if (!prNumber && workflowConclusion !== 'success') {
    reason = 'The workflow did not provide a valid pull request context, so remediation is blocked.';
  } else if (workflowConclusion !== 'failure') {
    reason = 'The workflow completed successfully, so no dependency remediation is required.';
  } else if (riskClassification === 'HIGH' || riskClassification === 'UNKNOWN') {
    reason = 'The dependency risk is too high or ambiguous for unattended remediation; a human maintainer must review it.';
  } else if (!dependencyEcosystem || dependencyEcosystem === 'unknown') {
    reason = 'The dependency ecosystem could not be determined, so remediation must be reviewed manually.';
  } else {
    eligible = 'true';
    remediationComplexity = riskClassification === 'LOW' ? 'low' : 'medium';
    reason = `Dependency remediation is eligible for controlled review. Risk is ${riskClassification.toUpperCase()} and ecosystem is ${dependencyEcosystem}.`;
  }

  if (riskClassification === 'LOW' && workflowConclusion === 'failure') {
    remediationComplexity = 'low';
  } else if (riskClassification === 'MEDIUM') {
    remediationComplexity = 'medium';
  }

  const output = {
    eligible,
    remediation_complexity: remediationComplexity,
    risk: riskClassification,
    reason,
  };

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `eligible=${output.eligible}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `remediation_complexity=${output.remediation_complexity}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `risk=${output.risk}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `reason=${output.reason}\n`);
  }

  console.log(JSON.stringify(output, null, 2));
}

main();
