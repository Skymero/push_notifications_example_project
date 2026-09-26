module.exports = {
  preset: 'jest-expo',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
