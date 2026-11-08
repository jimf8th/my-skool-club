#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    args[key] = next;
    if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) i += 1;
  }
  return args;
}

function normalizeState(value) {
  const normalized = String(value || 'disabled').trim().toLowerCase();
  return ['enabled', 'true', '1', 'on'].includes(normalized) ? 'enabled' : 'disabled';
}

function writeState(state, filePath) {
  const payload = {
    state,
    updatedAt: new Date().toISOString(),
    reason: state === 'enabled'
      ? 'Production deployment is intentionally blocked by the repository kill switch.'
      : 'Production deployment is allowed by policy.',
    manualRecoveryRequired: state === 'enabled',
  };
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = String(args.mode || 'check').toLowerCase();
  const state = normalizeState(args.state || process.env.DEPLOYMENT_KILL_SWITCH || process.env.DEPLOYMENT_KILL_SWITCH_STATE || 'disabled');
  const filePath = path.resolve(__dirname, '..', 'production-kill-switch.json');

  if (mode === 'set') {
    const payload = writeState(state, filePath);
    console.log(JSON.stringify({ mode: 'set', ...payload }, null, 2));
    return;
  }

  if (state === 'enabled') {
    console.log('DEPLOYMENT_KILL_SWITCH=enabled; production deployment is blocked until it is explicitly disabled.');
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, 'deployment_blocked=true\n');
      fs.appendFileSync(process.env.GITHUB_OUTPUT, 'toggle_state=enabled\n');
    }
    process.exit(1);
  }

  const payload = writeState('disabled', filePath);
  console.log(JSON.stringify({ mode: 'check', ...payload }, null, 2));
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'deployment_blocked=false\n');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'toggle_state=disabled\n');
  }
}

main();
