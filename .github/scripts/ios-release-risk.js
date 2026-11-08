#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const manifestPath = path.resolve(__dirname, '..', 'ios-release-manifest.json');
const repoRoot = path.resolve(__dirname, '..', '..');
const relevantPatterns = [
  /^mobile\//,
  /^mobile\.[a-z]+$/,
  /^mobile\/.*\.(js|jsx|ts|tsx|json)$/,
  /^app\.json$/,
  /^app\.config\.js$/,
  /^eas\.json$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^backend\//,
  /^frontend\//,
  /^docs\/.*(mobile|api|release|security|testing).*$/i,
  /^\.github\/workflows\//,
  /^\.github\/scripts\//,
  /^scripts\//,
  /^README\.md$/,
];

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    values[key] = next;
    if (next !== 'true' && argv[i + 1] && !argv[i + 1].startsWith('--')) i += 1;
  }
  return values;
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    return { app: 'My Skool Club', releases: [] };
  }
}

function getLastReleaseCommit(manifest) {
  if (!manifest || !manifest.lastSuccessfulRelease || !manifest.lastSuccessfulRelease.gitCommit) {
    return null;
  }
  return manifest.lastSuccessfulRelease.gitCommit;
}

function getChangedFiles(compareRef) {
  const command = compareRef
    ? `git -C "${repoRoot}" diff --name-only "${compareRef}" HEAD`
    : `git -C "${repoRoot}" diff --name-only HEAD~25 HEAD`;

  try {
    return execSync(command, { encoding: 'utf8' })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}

function isRelevant(file) {
  const normalized = file.replace(/\\/g, '/');
  if (!normalized || normalized === 'package-lock.json') return true;
  return relevantPatterns.some((pattern) => pattern.test(normalized));
}

function classify(files) {
  if (!files.length) {
    return {
      releaseDecision: 'skip',
      risk: 'LOW',
      reason: 'No relevant code or release inputs changed since the last successful iOS release.',
      relevantFiles: [],
    };
  }

  const relevantFiles = files.filter(isRelevant);
  const changeSet = new Set(relevantFiles);

  const highRisk = relevantFiles.some((file) => /^backend\//.test(file) || /^frontend\//.test(file) || /api|contract|auth|firebase/i.test(file));
  const mediumRisk = relevantFiles.some((file) => /mobile\//.test(file) || /app\.json$/.test(file) || /eas\.json$/.test(file) || /^package\.json$/.test(file) || /^package-lock\.json$/.test(file));

  if (highRisk || relevantFiles.some((file) => /^\.github\/workflows\//.test(file) || /^scripts\//.test(file))) {
    return {
      releaseDecision: 'proceed',
      risk: 'HIGH',
      reason: 'Relevant app, API contract, or release automation changes were detected and require policy review.',
      relevantFiles: Array.from(changeSet),
    };
  }

  if (mediumRisk) {
    return {
      releaseDecision: 'proceed',
      risk: 'MEDIUM',
      reason: 'Relevant mobile app and configuration changes were detected; release is permitted only after full validation.',
      relevantFiles: Array.from(changeSet),
    };
  }

  return {
    releaseDecision: 'proceed',
    risk: 'LOW',
    reason: 'Relevant mobile-safe changes are present and eligible for automatic release once validation passes.',
    relevantFiles: Array.from(changeSet),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = readManifest();
  const lastReleaseCommit = args.compare || getLastReleaseCommit(manifest);
  const changedFiles = getChangedFiles(lastReleaseCommit);
  const result = classify(changedFiles);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `release_decision=${result.releaseDecision}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `release_risk=${result.risk}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `release_reason=${result.reason}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `relevant_files=${result.relevantFiles.join(',')}\n`);
  }

  console.log(JSON.stringify({
    compareRef: lastReleaseCommit || 'HEAD~25',
    releaseDecision: result.releaseDecision,
    risk: result.risk,
    reason: result.reason,
    relevantFiles: result.relevantFiles,
    changedFiles,
  }, null, 2));
}

main();
