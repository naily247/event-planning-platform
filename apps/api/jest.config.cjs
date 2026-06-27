module.exports = {
  testEnvironment: 'node',

  roots: ['<rootDir>/src'],

  testMatch: ['**/*.test.ts'],

  setupFiles: ['<rootDir>/src/test/setup-env.ts'],

  moduleFileExtensions: ['ts', 'js', 'json'],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },

  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
