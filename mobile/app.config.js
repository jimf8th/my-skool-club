const { getEnvironmentConfig } = require('./config/environments');

module.exports = ({ config }) => {
  // Defaulting to dev is deliberate: a local command with no environment can
  // never accidentally produce the production app identity.
  const environment = getEnvironmentConfig(
    process.env.APP_ENV || process.env.EXPO_PUBLIC_APP_ENV,
    'dev'
  );

  return {
    ...config,
    name: environment.name,
    scheme: environment.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: environment.identifier,
    },
    android: {
      ...config.android,
      package: environment.identifier,
    },
    extra: {
      ...(config.extra || {}),
      appEnvironment: environment.key,
      ...(environment.apiUrl ? { apiUrl: environment.apiUrl } : {}),
    },
  };
};
