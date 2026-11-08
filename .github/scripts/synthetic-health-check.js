#!/usr/bin/env node

const http = require('http');
const https = require('https');

function request(url) {
  return new Promise((resolve, reject) => {
    const targetUrl = typeof url === 'string' ? new URL(url) : url;
    const transport = targetUrl.protocol === 'https:' ? https : http;
    const req = transport.get(targetUrl, { headers: { 'User-Agent': 'MySkoolClub-Synthetic-Monitor/1.0' } }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.setTimeout(15000, () => { req.destroy(new Error('Request timed out')); });
    req.on('error', reject);
  });
}

async function checkEndpoint(baseUrl) {
  const url = new URL(baseUrl);
  const healthUrl = new URL('/api/health', url.origin || url.href);
  const response = await request(healthUrl.toString());
  return {
    endpoint: healthUrl.toString(),
    statusCode: response.statusCode,
    healthy: response.statusCode >= 200 && response.statusCode < 400,
    body: response.body,
  };
}

async function main() {
  const input = (process.argv[2] || process.env.PRODUCTION_BASE_URL || process.env.PUBLIC_BASE_URL || 'https://myskoolclub.com').trim();
  if (!input) {
    throw new Error('No base URL was provided for the synthetic check.');
  }

  const results = await checkEndpoint(input);
  console.log(JSON.stringify(results, null, 2));

  if (!results.healthy) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Synthetic health check failed: ${error.message}`);
  process.exit(1);
});
