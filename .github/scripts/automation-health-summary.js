#!/usr/bin/env node

const fs = require('fs');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    args[key] = value;
    if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) i += 1;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const status = String(args.status || process.env.HEALTH_STATUS || 'degraded').toLowerCase();
  const dependencies = String(args['dependency-vulns'] || process.env.DEPENDENCY_VULNS || '0');
  const deployments = String(args.deployments || process.env.DEPLOYMENTS || '0');
  const rollbacks = String(args.rollbacks || process.env.ROLLBACKS || '0');
  const releases = String(args['mobile-releases'] || process.env.MOBILE_RELEASES || '0');
  const alerts = String(args.alerts || process.env.ALERTS || '0');

  const summary = [
    '## Automation health summary',
    '',
    `- Overall status: **${status.toUpperCase()}**`,
    `- Open dependency vulnerabilities: **${dependencies}**`,
    `- Cloud Run deployments tracked: **${deployments}**`,
    `- Rollbacks: **${rollbacks}**`,
    `- Mobile release checks: **${releases}**`,
    `- Automation alerts requiring attention: **${alerts}**`,
    '',
    '### Recommended actions',
    '- Confirm the latest GitHub Actions workflow outcomes.',
    '- Review open dependency security updates and unresolved risk classifications.',
    '- Verify the current production health endpoint and Cloud Run revision health.',
    '- Maintain the deployment kill switch in the disabled state unless an incident requires a stop.'
  ].join('\n');

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${status}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `summary<<EOF\n${summary}\nEOF\n`);
  }

  console.log(summary);
}

main();
