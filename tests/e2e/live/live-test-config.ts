/**
 * Live E2E Test Configuration
 * Configuration for tests that require real Steam API credentials and bot accounts
 */

export interface LiveTestConfig {
  // Application URLs
  app: {
    baseUrl: string;
    apiUrl: string;
    wsUrl: string;
  };

  // Steam API credentials for live testing
  steam: {
    apiKey: string;
    // Test user credentials with real Steam account
    testUser: {
      steamId: string;
      username: string;
      displayName: string;
      tradeUrl: string;
      apiKey: string; // User's Steam API key if needed
    };
    // Test bot credentials with real Steam bot account
    testBot: {
      steamId: string;
      username: string;
      sharedSecret: string;
      identitySecret: string;
      tradeUrl: string;
      apiKey: string;
      botId: string; // Backend bot ID
      password: string;
    };
  };

  // Backend bot configuration
  bot: {
    id: string;
    encryptionKey: string;
    credentials: {
      sharedSecret: string;
      identitySecret: string;
      password: string;
    };
  };

  // Timeout configurations (longer for live API calls)
  timeouts: {
    default: number;
    navigation: number;
    api: number;
    trade: number;
    inventory: number;
    steamApi: number; // Longer timeouts for Steam API
    tradePolling: number; // Extended timeout for full trade cycle
    confirmation: number; // Timeout for Mobile Auth confirmation
    completeFlow: number; // Timeout for complete E2E flow test
  };

  // Database connections for live test data
  databases: {
    postgres: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
    };
    mongodb: {
      uri: string;
    };
    redis: {
      host: string;
      port: number;
      password: string;
      db: number;
    };
  };

  // Feature flags for live test suites
  features: {
    auth: boolean;
    inventory: boolean;
    trading: boolean;
    pricing: boolean;
    wallet: boolean;
    realtime: boolean;
    admin: boolean;
    market: boolean;
  };

  // Retry configuration (more retries for live APIs)
  retry: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };

  // Safety limits for live testing
  limits: {
    maxTradesPerTest: number;
    maxInventorySyncs: number;
    maxPricingUpdates: number;
    testDurationMinutes: number;
    maxConcurrentTrades: number;
    maxErrorCount: number;
  };

  // Logging configuration
  logging: {
    enableVerbose: boolean;
    logLevel: string;
    logWebSocketEvents: boolean;
    logTradeStatusChanges: boolean;
  };

  // Monitoring configuration for complete E2E flow
  monitoring: {
    enabled: boolean;
    logEndpoint?: string;
    logFile?: string;
    apiToken?: string;
    pollInterval: number;
    enableLogAnalysis: boolean;
    enablePerformanceMonitoring: boolean;
    enableErrorTracking: boolean;
  };

  // Performance configuration
  performance: {
    thresholds: {
      maxPageLoadTime: number;
      maxApiResponseTime: number;
      maxTradeCompletionTime: number;
      maxInventorySyncTime: number;
      maxMemoryUsage: number;
      acceptableErrorRate: number;
    };
    enableMetricsCollection: boolean;
    enableWebVitals: boolean;
    enableMemoryMonitoring: boolean;
    enableNetworkMonitoring: boolean;
  };

  // Reporting configuration
  reporting: {
    format: string[];
    outputDir: string;
    includeScreenshots: boolean;
    includeLogs: boolean;
    includePerformanceMetrics: boolean;
    includeErrorAnalysis: boolean;
    includeSystemHealth: boolean;
    generateRecommendations: boolean;
  };

  // Error scenario configuration
  errorScenarios: {
    enabled: boolean;
    scenarios: string[];
    enableRecoveryTesting: boolean;
    enableDataLossTesting: boolean;
    mockApiFailures: boolean;
    mockNetworkFailures: boolean;
  };
}

/**
 * Default live test configuration
 * This configuration should be overridden by environment variables in CI/staging
 */
export const liveTestConfig: LiveTestConfig = {
  // Application URLs
  app: {
    baseUrl: process.env.LIVE_TEST_BASE_URL || 'https://staging.example.com',
    apiUrl: process.env.LIVE_TEST_API_URL || 'https://staging-api.example.com/api',
    wsUrl: process.env.LIVE_TEST_WS_URL || 'ws://localhost:3001',
  },

  // Steam API credentials - MUST be set via environment variables
  steam: {
    apiKey: process.env.STEAM_API_KEY || '',
    testUser: {
      steamId: process.env.TEST_USER_STEAM_ID || '',
      username: process.env.TEST_USER_USERNAME || '',
      displayName: process.env.TEST_USER_DISPLAY_NAME || '',
      tradeUrl: process.env.TEST_USER_TRADE_URL || '',
      apiKey: process.env.TEST_USER_API_KEY || '',
    },
    testBot: {
      steamId: process.env.TEST_BOT_STEAM_ID || '',
      username: process.env.TEST_BOT_USERNAME || '',
      sharedSecret: process.env.TEST_BOT_SHARED_SECRET || '',
      identitySecret: process.env.TEST_BOT_IDENTITY_SECRET || '',
      tradeUrl: process.env.TEST_BOT_TRADE_URL || '',
      apiKey: process.env.TEST_BOT_API_KEY || '',
      botId: process.env.TEST_BOT_ID || '',
      password: process.env.TEST_BOT_PASSWORD || '',
    },
  },

  // Backend bot configuration
  bot: {
    id: process.env.TEST_BOT_ID || '',
    encryptionKey: process.env.BOT_ENCRYPTION_KEY || '',
    credentials: {
      sharedSecret: process.env.TEST_BOT_SHARED_SECRET || '',
      identitySecret: process.env.TEST_BOT_IDENTITY_SECRET || '',
      password: process.env.TEST_BOT_PASSWORD || '',
    },
  },

  // Timeout configurations (longer for live API calls)
  timeouts: {
    default: 60000,        // 60 seconds
    navigation: 120000,     // 2 minutes for page loads
    api: 30000,            // 30 seconds for API calls
    trade: 300000,         // 5 minutes for trade flows
    inventory: 600000,     // 10 minutes for inventory sync
    steamApi: 60000,       // 1 minute for Steam API calls
    tradePolling: 300000,  // 5 minutes for full trade cycle
    confirmation: 60000,   // 1 minute for Mobile Auth confirmation
    completeFlow: 900000,  // 15 minutes for complete E2E flow test
  },

  // Database connections for live test data
  databases: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'steam_marketplace_staging',
      username: process.env.POSTGRES_USER || 'steam_user',
      password: process.env.POSTGRES_PASSWORD || 'steam_password',
    },
    mongodb: {
      uri: process.env.MONGODB_URI || `mongodb://localhost:${process.env.MONGO_PORT || '27017'}/${process.env.MONGO_DB || 'steam_marketplace_staging'}`,
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || 'redis_password',
      db: parseInt(process.env.REDIS_DB || '0'),
    },
  },

  // Feature flags for live test suites
  features: {
    auth: true,
    inventory: true,
    trading: true,
    pricing: true,
    wallet: true,
    realtime: true,
    admin: true,
    market: true,
  },

  // Retry configuration (more retries for live APIs)
  retry: {
    maxRetries: 5,
    baseDelay: 2000,   // 2 seconds
    maxDelay: 30000,   // 30 seconds
  },

  // Safety limits for live testing
  limits: {
    maxTradesPerTest: 1,      // Very conservative for live testing
    maxInventorySyncs: 1,
    maxPricingUpdates: 5,
    testDurationMinutes: 30,  // Maximum test duration
    maxConcurrentTrades: 3,
    maxErrorCount: 10,
  },

  // Logging configuration
  logging: {
    enableVerbose: process.env.LOG_LEVEL === 'debug' || false,
    logLevel: process.env.LOG_LEVEL || 'info',
    logWebSocketEvents: true,
    logTradeStatusChanges: true,
  },

  // Monitoring configuration for complete E2E flow
  monitoring: {
    enabled: process.env.ENABLE_MONITORING === 'true',
    logEndpoint: process.env.LOG_ENDPOINT,
    logFile: process.env.LOG_FILE,
    apiToken: process.env.LOG_API_TOKEN,
    pollInterval: parseInt(process.env.LOG_POLL_INTERVAL || '5000'),
    enableLogAnalysis: process.env.ENABLE_LOG_ANALYSIS === 'true',
    enablePerformanceMonitoring: process.env.ENABLE_PERF_MONITORING === 'true',
    enableErrorTracking: process.env.ENABLE_ERROR_TRACKING === 'true',
  },

  // Performance configuration
  performance: {
    thresholds: {
      maxPageLoadTime: parseInt(process.env.MAX_PAGE_LOAD_TIME || '3000'),
      maxApiResponseTime: parseInt(process.env.MAX_API_RESPONSE_TIME || '1000'),
      maxTradeCompletionTime: parseInt(process.env.MAX_TRADE_COMPLETION_TIME || '300000'),
      maxInventorySyncTime: parseInt(process.env.MAX_INVENTORY_SYNC_TIME || '600000'),
      maxMemoryUsage: parseInt(process.env.MAX_MEMORY_USAGE || '524288000'), // 500MB
      acceptableErrorRate: parseFloat(process.env.ACCEPTABLE_ERROR_RATE || '5.0'),
    },
    enableMetricsCollection: process.env.ENABLE_METRICS_COLLECTION === 'true',
    enableWebVitals: process.env.ENABLE_WEB_VITALS === 'true',
    enableMemoryMonitoring: process.env.ENABLE_MEMORY_MONITORING === 'true',
    enableNetworkMonitoring: process.env.ENABLE_NETWORK_MONITORING === 'true',
  },

  // Reporting configuration
  reporting: {
    format: (process.env.REPORT_FORMAT || 'html,json').split(','),
    outputDir: process.env.REPORT_OUTPUT_DIR || './tests/e2e/artifacts/reports',
    includeScreenshots: process.env.INCLUDE_SCREENSHOTS !== 'false',
    includeLogs: process.env.INCLUDE_LOGS !== 'false',
    includePerformanceMetrics: process.env.INCLUDE_PERFORMANCE_METRICS !== 'false',
    includeErrorAnalysis: process.env.INCLUDE_ERROR_ANALYSIS !== 'false',
    includeSystemHealth: process.env.INCLUDE_SYSTEM_HEALTH !== 'false',
    generateRecommendations: process.env.GENERATE_RECOMMENDATIONS !== 'false',
  },

  // Error scenario configuration
  errorScenarios: {
    enabled: process.env.ENABLE_ERROR_SCENARIOS === 'true',
    scenarios: (process.env.ERROR_SCENARIOS || 'invalid-trade-url,insufficient-balance,bot-offline').split(','),
    enableRecoveryTesting: process.env.ENABLE_RECOVERY_TESTING === 'true',
    enableDataLossTesting: process.env.ENABLE_DATA_LOSS_TESTING === 'true',
    mockApiFailures: process.env.MOCK_API_FAILURES === 'true',
    mockNetworkFailures: process.env.MOCK_NETWORK_FAILURES === 'true',
  },
};

/**
 * Validate complete test configuration for comprehensive E2E testing
 */
export const validateCompleteTestConfig = (config: LiveTestConfig = liveTestConfig): string[] => {
  const requiredEnvVars = [
    'STEAM_API_KEY',
    'TEST_USER_STEAM_ID',
    'TEST_USER_TRADE_URL',
    'TEST_BOT_STEAM_ID',
    'TEST_BOT_SHARED_SECRET',
    'TEST_BOT_IDENTITY_SECRET',
    'TEST_BOT_TRADE_URL',
    'TEST_BOT_PASSWORD',
    'BOT_ENCRYPTION_KEY',
    'ENABLE_LIVE_TESTS',
    'NODE_ENV'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    return missing;
  }

  // Validate Steam API key format
  if (config.steam.apiKey && !/^[A-Za-z0-9]{32}$/.test(config.steam.apiKey)) {
    return ['Invalid STEAM_API_KEY format - must be 32-character alphanumeric string'];
  }

  // Validate Steam IDs
  if (config.steam.testUser.steamId && !/^\d{17,19}$/.test(config.steam.testUser.steamId)) {
    return ['Invalid TEST_USER_STEAM_ID format - must be 17-19 digit Steam64 ID'];
  }

  if (config.steam.testBot.steamId && !/^\d{17,19}$/.test(config.steam.testBot.steamId)) {
    return ['Invalid TEST_BOT_STEAM_ID format - must be 17-19 digit Steam64 ID'];
  }

  // Validate trade URLs
  const tradeUrlRegex = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d{17,19}&token=[a-zA-Z0-9_-]+$/;
  if (config.steam.testUser.tradeUrl && !tradeUrlRegex.test(config.steam.testUser.tradeUrl)) {
    return ['Invalid TEST_USER_TRADE_URL format'];
  }

  if (config.steam.testBot.tradeUrl && !tradeUrlRegex.test(config.steam.testBot.tradeUrl)) {
    return ['Invalid TEST_BOT_TRADE_URL format'];
  }

  // Validate bot secrets
  if (config.steam.testBot.sharedSecret && config.steam.testBot.sharedSecret.length !== 28) {
    return ['Invalid TEST_BOT_SHARED_SECRET - must be 28 characters'];
  }

  if (config.steam.testBot.identitySecret && config.steam.testBot.identitySecret.length !== 28) {
    return ['Invalid TEST_BOT_IDENTITY_SECRET - must be 28 characters'];
  }

  // Validate bot password
  if (config.steam.testBot.password && config.steam.testBot.password.length === 0) {
    return ['TEST_BOT_PASSWORD cannot be empty'];
  }

  // Validate environment
  if (process.env.ENABLE_LIVE_TESTS !== 'true') {
    return ['ENABLE_LIVE_TESTS must be set to "true"'];
  }

  if (process.env.NODE_ENV !== 'staging') {
    return ['NODE_ENV must be set to "staging" for live tests'];
  }

  return [];
};

/**
 * Validate monitoring configuration
 */
export const validateMonitoringConfig = (config: LiveTestConfig = liveTestConfig): string[] => {
  const errors: string[] = [];

  if (!config.monitoring.enabled) {
    return errors;
  }

  if (config.monitoring.enabled && !config.monitoring.logEndpoint && !config.monitoring.logFile) {
    errors.push('Either LOG_ENDPOINT or LOG_FILE must be configured when monitoring is enabled');
  }

  if (config.monitoring.pollInterval && (config.monitoring.pollInterval < 1000 || config.monitoring.pollInterval > 60000)) {
    errors.push('LOG_POLL_INTERVAL must be between 1000ms and 60000ms');
  }

  return errors;
};

/**
 * Validate performance thresholds
 */
export const validatePerformanceThresholds = (config: LiveTestConfig = liveTestConfig): string[] => {
  const errors: string[] = [];
  const thresholds = config.performance.thresholds;

  if (thresholds.maxPageLoadTime <= 0) {
    errors.push('MAX_PAGE_LOAD_TIME must be greater than 0');
  }

  if (thresholds.maxApiResponseTime <= 0) {
    errors.push('MAX_API_RESPONSE_TIME must be greater than 0');
  }

  if (thresholds.maxTradeCompletionTime <= 0) {
    errors.push('MAX_TRADE_COMPLETION_TIME must be greater than 0');
  }

  if (thresholds.maxMemoryUsage <= 0) {
    errors.push('MAX_MEMORY_USAGE must be greater than 0');
  }

  if (thresholds.acceptableErrorRate < 0 || thresholds.acceptableErrorRate > 100) {
    errors.push('ACCEPTABLE_ERROR_RATE must be between 0 and 100');
  }

  return errors;
};

/**
 * Validate reporting configuration
 */
export const validateReportingConfig = (config: LiveTestConfig = liveTestConfig): string[] => {
  const errors: string[] = [];

  if (!config.reporting.outputDir) {
    errors.push('REPORT_OUTPUT_DIR must be specified');
  }

  if (config.reporting.format.length === 0) {
    errors.push('At least one report format must be specified');
  }

  return errors;
};

/**
 * Get full API endpoint URL
 */
export const getApiEndpoint = (name: string, config: LiveTestConfig = liveTestConfig): string => {
  const endpoints: Record<string, string> = {
    trades: `${config.app.apiUrl}/trades`,
    inventory: `${config.app.apiUrl}/inventory`,
    wallet: `${config.app.apiUrl}/wallet`,
    auth: `${config.app.apiUrl}/auth`,
    admin: `${config.app.apiUrl}/admin`,
    logs: `${config.app.apiUrl}/admin/logs`,
    health: `${config.app.apiUrl}/health`,
    metrics: `${config.app.apiUrl}/admin/metrics`
  };

  return endpoints[name] || `${config.app.apiUrl}/${name}`;
};

/**
 * Get timeout for specific operation
 */
export const getTimeout = (operation: string, config: LiveTestConfig = liveTestConfig): number => {
  const timeouts: Record<string, number> = {
    default: config.timeouts.default,
    navigation: config.timeouts.navigation,
    api: config.timeouts.api,
    trade: config.timeouts.trade,
    inventory: config.timeouts.inventory,
    steamApi: config.timeouts.steamApi,
    tradePolling: config.timeouts.tradePolling,
    confirmation: config.timeouts.confirmation,
    completeFlow: config.timeouts.completeFlow
  };

  return timeouts[operation] || config.timeouts.default;
};

/**
 * Check if log monitoring is enabled
 */
export const shouldMonitorLogs = (config: LiveTestConfig = liveTestConfig): boolean => {
  return config.monitoring.enabled && config.monitoring.enableLogAnalysis;
};

/**
 * Check if performance monitoring is enabled
 */
export const shouldCollectMetrics = (config: LiveTestConfig = liveTestConfig): boolean => {
  return config.performance.enableMetricsCollection;
};

/**
 * Check if error scenarios are enabled
 */
export const shouldRunErrorScenarios = (config: LiveTestConfig = liveTestConfig): boolean => {
  return config.errorScenarios.enabled;
};

/**
 * Check if reporting should include specific components
 */
export const shouldIncludeInReport = (component: string, config: LiveTestConfig = liveTestConfig): boolean => {
  const components: Record<string, boolean> = {
    screenshots: config.reporting.includeScreenshots,
    logs: config.reporting.includeLogs,
    performance: config.reporting.includePerformanceMetrics,
    errors: config.reporting.includeErrorAnalysis,
    health: config.reporting.includeSystemHealth,
    recommendations: config.reporting.generateRecommendations
  };

  return components[component] !== false;
};

/**
 * Get environment variable mapping for documentation
 */
export const getEnvironmentVariables = (): Record<string, { description: string; required: boolean; defaultValue?: string }> => {
  return {
    ENABLE_LIVE_TESTS: {
      description: 'Enable live testing (must be "true")',
      required: true,
      defaultValue: 'false'
    },
    NODE_ENV: {
      description: 'Node environment (must be "staging" for live tests)',
      required: true,
      defaultValue: 'development'
    },
    LIVE_TEST_BASE_URL: {
      description: 'Base URL for live test application',
      required: false,
      defaultValue: 'https://staging.example.com'
    },
    LIVE_TEST_API_URL: {
      description: 'API URL for live test backend',
      required: false,
      defaultValue: 'https://staging-api.example.com/api'
    },
    LIVE_TEST_WS_URL: {
      description: 'WebSocket URL for live test backend',
      required: false,
      defaultValue: 'ws://localhost:3001'
    },
    STEAM_API_KEY: {
      description: '32-character Steam API key for testing',
      required: true,
      defaultValue: ''
    },
    TEST_USER_STEAM_ID: {
      description: 'Steam64 ID of test user account',
      required: true,
      defaultValue: ''
    },
    TEST_USER_TRADE_URL: {
      description: 'Trade URL of test user account',
      required: true,
      defaultValue: ''
    },
    TEST_BOT_STEAM_ID: {
      description: 'Steam64 ID of test bot account',
      required: true,
      defaultValue: ''
    },
    TEST_BOT_SHARED_SECRET: {
      description: '28-character shared secret of test bot',
      required: true,
      defaultValue: ''
    },
    TEST_BOT_IDENTITY_SECRET: {
      description: '28-character identity secret of test bot',
      required: true,
      defaultValue: ''
    },
    TEST_BOT_TRADE_URL: {
      description: 'Trade URL of test bot account',
      required: true,
      defaultValue: ''
    },
    TEST_BOT_PASSWORD: {
      description: 'Password of test bot account',
      required: true,
      defaultValue: ''
    },
    BOT_ENCRYPTION_KEY: {
      description: 'Encryption key for bot credentials',
      required: true,
      defaultValue: ''
    },
    ENABLE_MONITORING: {
      description: 'Enable log and performance monitoring',
      required: false,
      defaultValue: 'false'
    },
    LOG_ENDPOINT: {
      description: 'API endpoint for log collection',
      required: false,
      defaultValue: ''
    },
    ENABLE_PERF_MONITORING: {
      description: 'Enable performance metrics collection',
      required: false,
      defaultValue: 'false'
    },
    MAX_PAGE_LOAD_TIME: {
      description: 'Maximum acceptable page load time in milliseconds',
      required: false,
      defaultValue: '3000'
    },
    MAX_API_RESPONSE_TIME: {
      description: 'Maximum acceptable API response time in milliseconds',
      required: false,
      defaultValue: '1000'
    }
  };
};

/**
 * Validate live test configuration
 */
export const validateLiveTestConfig = (config: LiveTestConfig = liveTestConfig): void => {
  const missing = validateCompleteTestConfig(config);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for live testing: ${missing.join(', ')}`);
  }

  const monitoringErrors = validateMonitoringConfig(config);
  if (monitoringErrors.length > 0) {
    throw new Error(`Monitoring configuration errors: ${monitoringErrors.join(', ')}`);
  }

  const performanceErrors = validatePerformanceThresholds(config);
  if (performanceErrors.length > 0) {
    throw new Error(`Performance threshold errors: ${performanceErrors.join(', ')}`);
  }

  const reportingErrors = validateReportingConfig(config);
  if (reportingErrors.length > 0) {
    throw new Error(`Reporting configuration errors: ${reportingErrors.join(', ')}`);
  }
};

/**
 * Validate bot credentials specifically
 */
export const validateBotCredentials = (): string[] => {
  const required = [
    'TEST_BOT_STEAM_ID',
    'TEST_BOT_SHARED_SECRET',
    'TEST_BOT_IDENTITY_SECRET',
    'TEST_BOT_TRADE_URL',
    'TEST_BOT_PASSWORD',
  ];

  return required.filter(envVar => !process.env[envVar]);
};

/**
 * Validate user credentials specifically
 */
export const validateUserCredentials = (): string[] => {
  const required = [
    'TEST_USER_STEAM_ID',
    'TEST_USER_TRADE_URL',
  ];

  return required.filter(envVar => !process.env[envVar]);
};

/**
 * Check if live tests should run
 */
export const shouldRunLiveTests = (): boolean => {
  return process.env.ENABLE_LIVE_TESTS === 'true' &&
         process.env.NODE_ENV === 'staging';
};

export default liveTestConfig;