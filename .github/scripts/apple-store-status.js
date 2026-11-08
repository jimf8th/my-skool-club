#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function getJwt(privateKeyPem, keyId, issuerId) {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iss: issuerId, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })).toString('base64url');
  const signingInput = `${header}.${payload}`;
  const signer = crypto.createSign('sha256');
  signer.update(signingInput);
  const signature = signer.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' }, 'base64url');
  return `${signingInput}.${signature}`;
}

async function getJson(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}: ${await res.text()}`);
  }

  return res.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const appId = args.appId || process.env.APP_STORE_APP_ID;
  const versionId = args.versionId || process.env.APP_STORE_VERSION_ID;
  const apiKey = args.apiKey || process.env.APPLE_API_KEY;
  const keyId = args.keyId || process.env.APPLE_API_KEY_ID;
  const issuerId = args.issuerId || process.env.APPLE_ISSUER_ID;

  if (!appId || !versionId || !apiKey || !keyId || !issuerId) {
    console.log(JSON.stringify({ ok: false, reason: 'Missing App Store Connect API configuration.', required: ['APP_STORE_APP_ID', 'APP_STORE_VERSION_ID', 'APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_ISSUER_ID'] }, null, 2));
    process.exit(0);
  }

  const token = getJwt(apiKey, keyId, issuerId);
  const url = `https://api.appstoreconnect.apple.com/v1/apps/${appId}/appStoreVersions/${versionId}`;
  const data = await getJson(url, token);
  const status = data.data?.attributes?.appStoreState || 'UNKNOWN';

  console.log(JSON.stringify({ ok: true, status, appId, versionId, data }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
