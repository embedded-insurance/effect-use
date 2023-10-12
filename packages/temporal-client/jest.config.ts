import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.ts'],
  testPathIgnorePatterns: ['test/lib'],
  transform: { '^.+\\.ts$': ['ts-jest', { diagnostics: false }] },
  // Trying to avoid writing files to disk.
  // FIXME. This means we don't need to build dependent packages
  // Problem is all ei-tech packages would need to be at this location...
  // not clear why they can't be resolved using yarn workspaces ><
  moduleNameMapper: {
    '^@effect-use/([^/].*)/(.*)$': '<rootDir>/../$1/src/$2',
    '^@effect-use/(.*)$': '<rootDir>/../$1/src',
  },
}

export default config
