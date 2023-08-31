// import type { Config } from 'jest'

const config =
  //: Config
  {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/test/**/*.ts'],
    passWithNoTests: true,
  }

export default config
