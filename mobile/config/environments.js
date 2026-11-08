const REMOTE_API_URL = 'https://myskoolclub.com/api';

const ENVIRONMENTS = Object.freeze({
  dev: Object.freeze({
    key: 'dev',
    name: 'My Skool Club Dev',
    identifier: 'com.myskoolclub.app.dev',
    scheme: 'myskoolclub-dev',
    apiUrl: null,
  }),
  test: Object.freeze({
    key: 'test',
    name: 'My Skool Club Test',
    identifier: 'com.myskoolclub.app.test',
    scheme: 'myskoolclub-test',
    apiUrl: REMOTE_API_URL,
  }),
  prod: Object.freeze({
    key: 'prod',
    name: 'My Skool Club',
    identifier: 'com.myskoolclub.app',
    scheme: 'myskoolclub',
    apiUrl: REMOTE_API_URL,
  }),
});

const ALIASES = Object.freeze({
  development: 'dev',
  preview: 'test',
  production: 'prod',
});

function normalizeAppEnvironment(value, fallback = 'dev') {
  const requested = String(value || fallback).trim().toLowerCase();
  const normalized = ALIASES[requested] || requested;
  if (!ENVIRONMENTS[normalized]) {
    throw new Error(`Unsupported APP_ENV "${value}". Expected dev, test, or prod.`);
  }
  return normalized;
}

function getEnvironmentConfig(value, fallback) {
  return ENVIRONMENTS[normalizeAppEnvironment(value, fallback)];
}

module.exports = {
  ENVIRONMENTS,
  REMOTE_API_URL,
  getEnvironmentConfig,
  normalizeAppEnvironment,
};
