const buildAppConfig = require('../../app.config');
const baseAppConfig = require('../../app.json').expo;
const easConfig = require('../../eas.json');
const packageConfig = require('../../package.json');
const {
  ENVIRONMENTS,
  REMOTE_API_URL,
  getEnvironmentConfig,
  normalizeAppEnvironment,
} = require('../environments');

describe('mobile environment definitions', () => {
  const originalAppEnv = process.env.APP_ENV;
  const originalPublicAppEnv = process.env.EXPO_PUBLIC_APP_ENV;

  afterEach(() => {
    if (originalAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = originalAppEnv;
    if (originalPublicAppEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
    else process.env.EXPO_PUBLIC_APP_ENV = originalPublicAppEnv;
  });

  it('defines isolated identities and the approved API for all variants', () => {
    expect(ENVIRONMENTS).toEqual({
      dev: expect.objectContaining({
        name: 'My Skool Club Dev', identifier: 'com.myskoolclub.app.dev', apiUrl: null,
      }),
      test: expect.objectContaining({
        name: 'My Skool Club Test', identifier: 'com.myskoolclub.app.test', apiUrl: REMOTE_API_URL,
      }),
      prod: expect.objectContaining({
        name: 'My Skool Club', identifier: 'com.myskoolclub.app', apiUrl: REMOTE_API_URL,
      }),
    });
    expect(REMOTE_API_URL).toBe('https://myskoolclub.com/api');
    expect(new Set(Object.values(ENVIRONMENTS).map(({ identifier }) => identifier)).size).toBe(3);
  });

  it.each([
    ['development', 'dev'],
    ['preview', 'test'],
    ['production', 'prod'],
    ['TEST', 'test'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeAppEnvironment(input)).toBe(expected);
  });

  it('defaults safely to dev and rejects unknown environments', () => {
    expect(getEnvironmentConfig(undefined).key).toBe('dev');
    expect(() => normalizeAppEnvironment('staging')).toThrow(
      'Unsupported APP_ENV "staging". Expected dev, test, or prod.'
    );
  });

  it.each([
    ['dev', 'My Skool Club Dev', 'com.myskoolclub.app.dev', 'myskoolclub-dev', null],
    ['test', 'My Skool Club Test', 'com.myskoolclub.app.test', 'myskoolclub-test', REMOTE_API_URL],
    ['prod', 'My Skool Club', 'com.myskoolclub.app', 'myskoolclub', REMOTE_API_URL],
  ])('builds the %s Expo configuration', (appEnv, name, identifier, scheme, apiUrl) => {
    process.env.APP_ENV = appEnv;
    delete process.env.EXPO_PUBLIC_APP_ENV;

    const config = buildAppConfig({ config: baseAppConfig });

    expect(config.name).toBe(name);
    expect(config.scheme).toBe(scheme);
    expect(config.ios.bundleIdentifier).toBe(identifier);
    expect(config.android.package).toBe(identifier);
    expect(config.extra.appEnvironment).toBe(appEnv);
    if (apiUrl) expect(config.extra.apiUrl).toBe(apiUrl);
    else expect(config.extra).not.toHaveProperty('apiUrl');
  });

  it('lets APP_ENV take precedence over the public runtime variable', () => {
    process.env.APP_ENV = 'prod';
    process.env.EXPO_PUBLIC_APP_ENV = 'dev';
    expect(buildAppConfig({ config: baseAppConfig }).extra.appEnvironment).toBe('prod');
  });

  it('pins every EAS build profile to the intended variable environment', () => {
    expect(easConfig.build.development).toEqual(expect.objectContaining({
      developmentClient: true,
      environment: 'development',
      env: expect.objectContaining({ APP_ENV: 'dev', EXPO_PUBLIC_APP_ENV: 'dev' }),
    }));
    expect(easConfig.build.test).toEqual(expect.objectContaining({
      distribution: 'internal',
      environment: 'preview',
      env: {
        APP_ENV: 'test',
        EXPO_PUBLIC_APP_ENV: 'test',
        EXPO_PUBLIC_API_URL: REMOTE_API_URL,
      },
    }));
    expect(easConfig.build.production).toEqual(expect.objectContaining({
      environment: 'production',
      env: {
        APP_ENV: 'prod',
        EXPO_PUBLIC_APP_ENV: 'prod',
        EXPO_PUBLIC_API_URL: REMOTE_API_URL,
      },
    }));
    expect(easConfig.build['test-development']).toEqual(expect.objectContaining({
      extends: 'test', developmentClient: true,
    }));
  });

  it('provides explicit local start and build commands for each environment', () => {
    expect(packageConfig.scripts).toEqual(expect.objectContaining({
      'start:dev': expect.stringContaining('EXPO_PUBLIC_APP_ENV=dev'),
      'start:test': expect.stringContaining(`EXPO_PUBLIC_API_URL=${REMOTE_API_URL}`),
      'start:prod': expect.stringContaining(`EXPO_PUBLIC_API_URL=${REMOTE_API_URL}`),
      'build:dev': expect.stringContaining('--profile development'),
      'build:test': expect.stringContaining('--profile test'),
      'build:prod': expect.stringContaining('--profile production'),
    }));
  });
});
