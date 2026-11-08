const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
};
