const { getEnvironmentConfig } = require('./config/environments');

const GOOGLE_IOS_CLIENT_ID = '1020171079797-d0opi02bv54l0fqjp8lab396sch1h6g2.apps.googleusercontent.com';
// Reversed client ID required by the Google Sign-In SDK for iOS OAuth redirect.
const GOOGLE_IOS_REVERSED_SCHEME = `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID.split('.apps.googleusercontent.com')[0]}`;

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
    scheme: [environment.scheme, GOOGLE_IOS_REVERSED_SCHEME],
    plugins: [
      ...(config.plugins || []),
      ['@react-native-google-signin/google-signin'],
    ],
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
