#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

function detectEcosystem(files) {
  const combined = files.join(' ');
  if (combined.includes('pom.xml')) return 'maven';
  if (combined.includes('package.json') || combined.includes('package-lock.json')) return 'npm';
  if (combined.includes('Dockerfile') || combined.includes('docker-compose')) return 'docker';
  if (combined.includes('.github/workflows')) return 'github-actions';
  return 'unknown';
}

function isSourceChange(file) {
  const normalized = file.replace(/\\/g, '/');
  if (normalized.includes('/.github/')) return false;
  if (normalized.includes('/docs/')) return false;
  if (normalized.includes('/node_modules/')) return false;
  if (normalized.endsWith('.md')) return false;
  if (normalized.endsWith('package.json')) return false;
  if (normalized.endsWith('package-lock.json')) return false;
  if (normalized.endsWith('pom.xml')) return false;
  if (normalized === 'Dockerfile') return false;
  if (normalized.includes('docker-compose')) return false;
  if (normalized.endsWith('.yml') || normalized.endsWith('.yaml')) return false;
  const sourceExtensions = ['.js', '.jsx', '.ts', '.tsx', '.java', '.kt', '.kts', '.sql', '.properties', '.yaml', '.yml'];
  return sourceExtensions.some((extension) => normalized.endsWith(extension));
}

function classifyRisk({ files, ecosystem, updateType, packageNames, hasCriticalSeverity, hasSourceChanges, changedOutsideManifests }) {
  const policy = {
    defaults: { unknownRisk: 'HIGH' },
    sensitivePackages: [
      'firebase-admin',
      'firebase',
      'spring-security',
      'spring-boot-starter-security',
      'postgresql',
      'flyway-core',
      'flyway-database-postgresql',
      'react-router-dom',
      'axios',
      'openai',
      '@playwright/test',
      'vite',
      'expo',
      'react-native',
    ],
  };
  const normalizedPackageNames = packageNames.map((name) => name.toLowerCase());
  const sensitivePackage = normalizedPackageNames.some((name) =>
    policy.sensitivePackages.some((sensitive) => name.includes(sensitive.toLowerCase()))
  );
  const multiDependency = packageNames.length > 1 || files.filter((file) => /package-lock\.json|pom\.xml|package\.json/.test(file)).length > 1;
  const manifestOnly = files.every((file) => /package\.json|package-lock\.json|pom\.xml|Dockerfile|docker-compose|\.ya?ml|lock$|\.lock/.test(file));

  let risk = 'HIGH';
  let reasons = [];

  if (hasCriticalSeverity) {
    reasons.push('security advisory severity is high or critical');
  }

  if (updateType === 'major' || sensitivePackage || hasSourceChanges || changedOutsideManifests || ecosystem === 'docker') {
    risk = 'HIGH';
    reasons.push('major version, security-sensitive dependency, source code change, or deployment/runtime change is present');
  } else if (updateType === 'minor' || multiDependency || !manifestOnly) {
    risk = 'MEDIUM';
    reasons.push('minor update or multi-package/shared dependency change requires human review');
  } else if (updateType === 'patch' && !sensitivePackage && !hasSourceChanges && !changedOutsideManifests && !hasCriticalSeverity && manifestOnly) {
    risk = 'LOW';
    reasons.push('single patch update with no source changes or security-sensitive dependencies');
  } else {
    risk = policy.defaults?.unknownRisk || 'HIGH';
    reasons.push('risk classification is unknown or ambiguous');
  }

  if (risk === 'LOW' && !manifestOnly) {
    risk = 'MEDIUM';
    reasons.push('low-risk logic is blocked because the change is not manifest-only');
  }

  const autoMergeEligible = risk === 'LOW';
  return {
    classification: risk,
    autoMergeEligible,
    ecosystem,
    updateType,
    packageNames,
    reasons,
    sensitivePackage,
    multiDependency,
    manifestOnly,
    hasSourceChanges,
    changedOutsideManifests,
    hasCriticalSeverity,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const files = (args.files || process.env.CHANGED_FILES || '').split(/\s+/).filter(Boolean);
  const packageNames = (args.packageNames || args['package-names'] || process.env.PACKAGE_NAMES || '').split(/[\s,]+/).filter(Boolean);
  const ecosystem = (args.ecosystem || detectEcosystem(files) || process.env.ECOSYSTEM || 'unknown').toLowerCase();
  const updateType = (args.updateType || args['update-type'] || process.env.UPDATE_TYPE || 'minor').toLowerCase();
  const hasCriticalSeverity = ['critical', 'high'].includes((args.severity || process.env.SECURITY_SEVERITY || 'unknown').toLowerCase());
  const hasSourceChanges = files.some(isSourceChange);
  const changedOutsideManifests = files.some((file) => !/package\.json|package-lock\.json|pom\.xml|Dockerfile|docker-compose|\.ya?ml|node_modules/.test(file) && !file.startsWith('.github/'));

  const result = classifyRisk({
    files,
    ecosystem,
    updateType,
    packageNames: packageNames.length ? packageNames : ['firebase-admin'],
    hasCriticalSeverity,
    hasSourceChanges,
    changedOutsideManifests,
  });

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `classification=${result.classification}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `auto_merge_eligible=${result.autoMergeEligible}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `reasons=${result.reasons.join(' | ')}\n`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
