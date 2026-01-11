/**
 * Jest Configuration for E2E API Integration Tests
 */

export default {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/e2e/api/**/*.test.ts',
    '<rootDir>/tests/e2e/api/**/*.spec.ts'
  ],

  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Module name mapping for backend imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/backend/src/$1',
    '^@common/(.*)$': '<rootDir>/apps/backend/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/apps/backend/src/modules/$1',
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/e2e/setup/jest-setup.ts'
  ],

  // Teardown files
  globalTeardown: '<rootDir>/tests/e2e/setup/jest-teardown.ts',

  // Test timeout
  testTimeout: 30000,

  // Coverage configuration
  collectCoverageFrom: [
    'apps/backend/src/**/*.ts',
    '!apps/backend/src/**/*.spec.ts',
    '!apps/backend/src/**/*.test.ts',
    '!apps/backend/src/main.ts',
    '!apps/backend/src/**/*.interface.ts',
    '!apps/backend/src/**/*.constant.ts',
    '!apps/backend/src/**/*.enum.ts',
    '!apps/backend/src/**/*.dto.ts',
  ],

  coverageDirectory: '<rootDir>/tests/e2e/artifacts/coverage',

  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Error on deprecated features
  errorOnDeprecated: false,

  // Maximum worker processes
  maxWorkers: '50%',

  // Detect open handles
  detectOpenHandles: true,
  detectLeaks: false,

  // Force exit after tests complete
  forceExit: false,

  // Test result processor
  testResultsProcessor: 'jest-sonar-reporter',

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'E2E API Test Report',
        outputPath: 'tests/e2e/artifacts/api-test-report.html',
        publicPath: './',
        hideIcon: false,
        logoImgPath: undefined,
        inlineAssets: true,
      }
    ],
    [
      'jest-junit',
      {
        suiteName: 'E2E API Tests',
        outputDirectory: 'tests/e2e/artifacts/',
        outputFileName: 'api-junit.xml',
        uniqueOutputName: false,
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      }
    ]
  ],

  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: 'apps/backend/tsconfig.json',
      isolatedModules: true,
    },
  },

  // Setup files
  setupFiles: [],

  // Snapshot serializers
  snapshotSerializers: [],

  // Test sequence
  testSequencer: '@jest/test-sequencer',

  // Module paths
  modulePaths: [
    '<rootDir>/apps/backend/src',
    '<rootDir>/tests/e2e/utils'
  ],

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
    'node'
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@nestjs|@types))'
  ],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Cache directory
  cacheDirectory: '<rootDir>/tests/e2e/artifacts/jest-cache',

  // Reset mocks
  resetMocks: false,
  resetModules: false,

  // Mock data
  clearMocks: true,

  // Error on deprecated
  errorOnDeprecated: false,

  // Notify
  notify: false,
  notifyMode: 'failure-change',

  // Projects (if needed for different test types)
  projects: [],

  // Extra globals
  extraGlobals: [],

  // Haste options
  haste: {
    computeSha1: false,
    throwOnModuleCollision: false,
  },

  // Inject globals
  injectGlobals: true,

  // Fake timers
  fakeTimers: {
    enableGlobally: false,
    advanceTimers: false,
    doNotFake: [],
    now: 0,
    timerLimit: 10000,
  },

  // Global setup
  globalSetup: undefined,

  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/apps/backend/src',
    '<rootDir>/tests/e2e/utils'
  ],

  // Extensions to treat as ESM
  extensionsToTreatAsEsm: [],

  // Name
  name: 'e2e-api-tests',

  // Notify mode
  notifyMode: 'failure-change',

  // Pass with partial coverage
  passWithPartialCoverage: false,

  // Collect coverage from
  collectCoverage: true,

  // Coverage path ignore
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],

  // Coverage provider
  coverageProvider: 'v8',

  // Collect coverage from
  collectCoverageFrom: [
    'apps/backend/src/modules/**/*.ts',
    'apps/backend/src/common/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!**/*.interface.ts',
    '!**/*.constant.ts',
    '!**/*.enum.ts',
    '!**/*.dto.ts',
  ],

  // Coverage ignore globs
  coverageIgnoreGlobs: [
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/*.interface.ts',
    '**/*.constant.ts',
    '**/*.enum.ts',
    '**/*.dto.ts',
  ],

  // Projects
  projects: [],

  // Resolutions
  resolver: undefined,

  // Root directory
  rootDir: '<rootDir>',

  // Run tests with transformer
  runner: '@jest/runner',

  // Skip filter
  skipFilter: false,

  // Skip plugins
  skipPlugins: [],

  // Slow test threshold
  slowTestThreshold: 5,

  // Snapshot format
  snapshotFormat: {},

  // Test timeout
  testTimeout: 30000,

  // Update snapshot
  updateSnapshot: false,

  // Use inline snapshot
  useInlineSnapshots: false,

  // Verbose
  verbose: true,
};