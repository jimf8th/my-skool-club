const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 78,
      statements: 78,
    },
  },
};
