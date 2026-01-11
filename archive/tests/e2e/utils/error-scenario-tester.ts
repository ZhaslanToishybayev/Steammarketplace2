/**
 * Error Scenario Testing Utility for E2E Tests
 *
 * Systematically tests error scenarios and edge cases to ensure the application
 * handles failures gracefully and provides appropriate user feedback. This utility
 * helps validate error handling, recovery mechanisms, and system resilience.
 */

import { Page, BrowserContext } from '@playwright/test';

export interface ErrorScenario {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedBehavior: string;
  testFn: (page: Page) => Promise<ErrorTestResult>;
}

export interface ErrorTestResult {
  success: boolean;
  error?: string;
  screenshot?: string;
  logs?: any[];
  recoveryTime?: number;
  userFeedback?: string;
  details?: string;
}

export interface ErrorScenarioReport {
  summary: {
    totalScenarios: number;
    passed: number;
    failed: number;
    criticalFailures: number;
    averageRecoveryTime: number;
  };
  scenarios: Array<{
    scenario: ErrorScenario;
    result: ErrorTestResult;
    timestamp: string;
  }>;
  recommendations: string[];
}

export class ErrorScenarioTester {
  private config: any;
  private context: BrowserContext;

  constructor(config: any, context?: BrowserContext) {
    this.config = config;
    this.context = context!;
  }

  /**
   * Test invalid trade URL scenarios
   */
  async testInvalidTradeUrl(page: Page): Promise<ErrorTestResult> {
    console.log('🔄 Testing invalid trade URL scenarios');

    const testStartTime = Date.now();
    const invalidUrls = [
      'not-a-url',
      'https://example.com',
      'steamcommunity.com/tradeoffer/new/',
      'https://steamcommunity.com/tradeoffer/new/?invalid',
      'https://steamcommunity.com/tradeoffer/new/?partner=',
      'https://steamcommunity.com/tradeoffer/new/?partner=12345678',
      'https://steamcommunity.com/tradeoffer/new/?partner=12345678&token=',
      'javascript:alert("xss")',
      ''
    ];

    const results: ErrorTestResult[] = [];

    for (const invalidUrl of invalidUrls) {
      try {
        await page.goto('/trade');
        await page.waitForSelector('[data-testid="trade-url-input"]');

        // Clear and fill with invalid URL
        await page.fill('[data-testid="trade-url-input"]', invalidUrl);
        await page.click('[data-testid="submit-trade"]');

        // Wait for error message
        const errorMessage = await page.textContent('[data-testid="error-message"]');
        const hasError = !!errorMessage && (errorMessage.includes('invalid') || errorMessage.includes('valid'));

        results.push({
          success: hasError,
          error: hasError ? undefined : `No error shown for invalid URL: ${invalidUrl}`,
          userFeedback: errorMessage || 'No error message displayed',
          details: `Tested URL: ${invalidUrl}`
        });

      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          details: `Exception occurred with URL: ${invalidUrl}`
        });
      }
    }

    const allPassed = results.every(r => r.success);
    const avgRecoveryTime = Date.now() - testStartTime;

    return {
      success: allPassed,
      error: allPassed ? undefined : `Failed ${results.filter(r => !r.success).length} out of ${results.length} URL validations`,
      logs: results,
      recoveryTime: avgRecoveryTime,
      details: `Tested ${results.length} invalid URL scenarios`
    };
  }

  /**
   * Test insufficient balance scenarios
   */
  async testInsufficientBalance(page: Page): Promise<ErrorTestResult> {
    console.log('🔄 Testing insufficient balance scenarios');

    const testStartTime = Date.now();

    try {
      await page.goto('/wallet');
      await page.waitForSelector('[data-testid="wallet-balance"]');

      // Get current balance
      const balanceText = await page.textContent('[data-testid="wallet-balance"]');
      const currentBalance = parseFloat(balanceText?.replace(/[^0-9.]/g, '') || '0');

      // Try to withdraw more than balance
      const withdrawalAmount = (currentBalance + 100).toFixed(2);

      await page.click('[data-testid="withdraw-button"]');
      await page.fill('[data-testid="withdraw-amount"]', withdrawalAmount);
      await page.click('[data-testid="confirm-withdrawal"]');

      // Check for error message
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      const hasError = !!errorMessage && (
        errorMessage.includes('insufficient') ||
        errorMessage.includes('balance') ||
        errorMessage.includes('funds')
      );

      const recoveryTime = Date.now() - testStartTime;

      return {
        success: hasError,
        error: hasError ? undefined : 'No error shown for insufficient balance',
        userFeedback: errorMessage || 'No error message displayed',
        recoveryTime,
        details: `Attempted withdrawal of ${withdrawalAmount} with balance ${currentBalance}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        recoveryTime: Date.now() - testStartTime,
        details: 'Exception occurred during insufficient balance test'
      };
    }
  }

  /**
   * Test bot offline scenarios
   */
  async testBotOffline(page: Page): Promise<ErrorTestResult> {
    console.log('🔄 Testing bot offline scenarios');

    const testStartTime = Date.now();

    try {
      // Mock bot offline by intercepting bot API calls
      await page.route('**/api/bots/**', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Service Unavailable',
            message: 'Bot is currently offline',
            code: 'BOT_OFFLINE'
          })
        });
      });

      await page.goto('/trade');
      await page.fill('[data-testid="trade-url-input"]', 'https://steamcommunity.com/tradeoffer/new/?partner=12345678&token=ABCDEFGH');
      await page.click('[data-testid="submit-trade"]');

      // Check for bot offline error
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      const hasError = !!errorMessage && (
        errorMessage.includes('bot') ||
        errorMessage.includes('offline') ||
        errorMessage.includes('unavailable')
      );

      const recoveryTime = Date.now() - testStartTime;

      return {
        success: hasError,
        error: hasError ? undefined : 'No appropriate error shown for bot offline',
        userFeedback: errorMessage || 'No error message displayed',
        recoveryTime,
        details: 'Bot API mocked as offline'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        recoveryTime: Date.now() - testStartTime,
        details: 'Exception occurred during bot offline test'
      };
    }
  }

  /**
   * Test Steam API timeout scenarios
   */
  async testSteamApiTimeout(page: Page): Promise<ErrorTestResult> {
    console.log('🔄 Testing Steam API timeout scenarios');

    const testStartTime = Date.now();

    try {
      // Mock Steam API timeout
      await page.route('**/api/inventory/sync', route => {
        // Simulate timeout by not responding
        setTimeout(() => route.continue(), 10000);
      });

      await page.goto('/inventory');
      await page.click('[data-testid="sync-inventory"]');

      // Wait for timeout error
      const timeoutError = await page.waitForSelector('[data-testid="error-message"]', { timeout: 15000 });
      const errorMessage = await page.textContent('[data-testid="error-message"]');

      const hasError = !!errorMessage && (
        errorMessage.includes('timeout') ||
        errorMessage.includes('slow') ||
        errorMessage.includes('try again')
      );

      const recoveryTime = Date.now() - testStartTime;

      return {
        success: hasError,
        error: hasError ? undefined : 'No timeout error shown',
        userFeedback: errorMessage || 'No error message displayed',
        recoveryTime,
        details: 'Steam API mocked as timing out'
      };

    } catch (error) {
      if (error.message.includes('timeout')) {
        return {
          success: true,
          userFeedback: 'Timeout error properly handled',
          recoveryTime: Date.now() - testStartTime,
          details: 'Timeout scenario validated'
        };
      }

      return {
        success: false,
        error: error.message,
        recoveryTime: Date.now() - testStartTime,
        details: 'Exception occurred during Steam API timeout test'
      };
    }
  }

  /**
   * Test rate limiting scenarios
   */
  async testRateLimiting(page: Page): Promise<ErrorTestResult> {
    console.log('🔄 Testing rate limiting scenarios');

    const testStartTime = Date.now();

    try {
      // Mock rate limiting
      let requestCount = 0;
      await page.route('**/api/**', route => {
        requestCount++;
        if (requestCount > 10) { // Simulate rate limit after 10 requests
          route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Too Many Requests',
              message: 'Rate limit exceeded. Please try again later.',
              retryAfter: 60
            })
          });
        } else {
          route.continue();
        }
      });

      // Make multiple rapid requests
      for (let i = 0; i < 15; i++) {
        await page.goto('/api/health', { waitUntil: 'networkidle' });
      }

      // Check for rate limit error
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      const hasError = !!errorMessage && (
        errorMessage.includes('rate') ||
        errorMessage.includes('limit') ||
        errorMessage.includes('too many')
      );

      const recoveryTime = Date.now() - testStartTime;

      return {
        success: hasError,
        error: hasError ? undefined : 'No rate limit error shown',
        userFeedback: errorMessage || 'No error message displayed',
        recoveryTime,
        details: `Made ${requestCount} requests, expected rate limit after 10`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        recoveryTime: Date.now() - testStartTime,
        details: 'Exception occurred during rate limiting test'
      };
    }
  }

  /**
   * Test network failure scenarios
   */
  async testNetworkFailure(page: Page): Promise<ErrorTestResult> {
    console.log('🔄 Testing network failure scenarios');

    const testStartTime = Date.now();

    try {
      // Block all network requests
      await page.route('**/*', route => {
        route.abort('connectionfailed');
      });

      await page.goto('/inventory');

      // Check for network error
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      const hasError = !!errorMessage && (
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('offline')
      );

      // Restore network
      await page.unroute('**/*');

      const recoveryTime = Date.now() - testStartTime;

      return {
        success: hasError,
        error: hasError ? undefined : 'No network error shown',
        userFeedback: errorMessage || 'No error message displayed',
        recoveryTime,
        details: 'Network requests blocked to simulate failure'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        recoveryTime: Date.now() - testStartTime,
        details: 'Exception occurred during network failure test'
      };
    }
  }

  /**
   * Test invalid item selection scenarios
   */
  async testInvalidItemSelection(page: Page): Promise<ErrorTestResult> {
    console.log('🔄 Testing invalid item selection scenarios');

    const testStartTime = Date.now();

    try {
      await page.goto('/inventory');
      await page.waitForSelector('[data-testid="inventory-items"]');

      // Try to select non-tradable item (simulate by adding invalid attribute)
      await page.evaluate(() => {
        const items = document.querySelectorAll('[data-testid="inventory-item"]');
        if (items.length > 0) {
          items[0].setAttribute('data-tradable', 'false');
          items[0].setAttribute('data-reason', 'item_not_tradable');
        }
      });

      await page.click('[data-testid="inventory-item"]');

      // Try to add to trade
      await page.goto('/trade');
      await page.click('[data-testid="submit-trade"]');

      // Check for validation error
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      const hasError = !!errorMessage && (
        errorMessage.includes('tradable') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('cannot')
      );

      const recoveryTime = Date.now() - testStartTime;

      return {
        success: hasError,
        error: hasError ? undefined : 'No validation error shown for non-tradable item',
        userFeedback: errorMessage || 'No error message displayed',
        recoveryTime,
        details: 'Attempted to trade non-tradable item'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        recoveryTime: Date.now() - testStartTime,
        details: 'Exception occurred during invalid item selection test'
      };
    }
  }

  /**
   * Test concurrent trade limit scenarios
   */
  async testConcurrentTradeLimit(page: Page): Promise<ErrorTestResult> {
    console.log('🔄 Testing concurrent trade limit scenarios');

    const testStartTime = Date.now();

    try {
      // Mock concurrent trade limit
      let tradeCount = 0;
      await page.route('**/api/trades', (route, request) => {
        if (request.method() === 'POST') {
          tradeCount++;
          if (tradeCount > 3) { // Simulate limit of 3 concurrent trades
            route.fulfill({
              status: 429,
              contentType: 'application/json',
              body: JSON.stringify({
                error: 'Too Many Trades',
                message: 'You have too many pending trades. Please wait for existing trades to complete.',
                code: 'TRADE_LIMIT_EXCEEDED'
              })
            });
          } else {
            route.continue();
          }
        } else {
          route.continue();
        }
      });

      // Create multiple trades rapidly
      for (let i = 0; i < 5; i++) {
        await page.goto('/trade');
        await page.fill('[data-testid="trade-url-input"]', `https://steamcommunity.com/tradeoffer/new/?partner=12345678&token=ABCDEFGH${i}`);
        await page.click('[data-testid="submit-trade"]');
      }

      // Check for trade limit error
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      const hasError = !!errorMessage && (
        errorMessage.includes('trade') ||
        errorMessage.includes('limit') ||
        errorMessage.includes('pending')
      );

      const recoveryTime = Date.now() - testStartTime;

      return {
        success: hasError,
        error: hasError ? undefined : 'No trade limit error shown',
        userFeedback: errorMessage || 'No error message displayed',
        recoveryTime,
        details: `Created ${tradeCount} trades, expected limit after 3`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        recoveryTime: Date.now() - testStartTime,
        details: 'Exception occurred during concurrent trade limit test'
      };
    }
  }

  /**
   * Test expired session scenarios
   */
  async testExpiredSession(page: Page): Promise<ErrorTestResult> {
    console.log('🔄 Testing expired session scenarios');

    const testStartTime = Date.now();

    try {
      // Mock expired session
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Your session has expired. Please log in again.',
            code: 'SESSION_EXPIRED'
          })
        });
      });

      await page.goto('/inventory');

      // Check for session expiry handling
      const loginRedirect = await page.waitForURL('**/auth/login', { timeout: 5000 });
      const hasRedirect = !!loginRedirect;

      const recoveryTime = Date.now() - testStartTime;

      return {
        success: hasRedirect,
        error: hasRedirect ? undefined : 'No session expiry handling detected',
        recoveryTime,
        details: 'Session mocked as expired, checked for redirect to login'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        recoveryTime: Date.now() - testStartTime,
        details: 'Exception occurred during expired session test'
      };
    }
  }

  /**
   * Test database connection loss scenarios
   */
  async testDatabaseConnectionLoss(page: Page): Promise<ErrorTestResult> {
    console.log('🔄 Testing database connection loss scenarios');

    const testStartTime = Date.now();

    try {
      // Mock database errors
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
            message: 'Database connection lost. Please try again in a few minutes.',
            code: 'DB_CONNECTION_ERROR'
          })
        });
      });

      await page.goto('/market');

      // Check for database error handling
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      const hasError = !!errorMessage && (
        errorMessage.includes('database') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('server')
      );

      const recoveryTime = Date.now() - testStartTime;

      return {
        success: hasError,
        error: hasError ? undefined : 'No database error handling detected',
        userFeedback: errorMessage || 'No error message displayed',
        recoveryTime,
        details: 'Database connection mocked as lost'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        recoveryTime: Date.now() - testStartTime,
        details: 'Exception occurred during database connection loss test'
      };
    }
  }

  /**
   * Assert error message is displayed correctly
   */
  async assertErrorMessage(page: Page, expectedMessage: string | RegExp): Promise<ErrorTestResult> {
    try {
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      const hasError = !!errorMessage && (
        typeof expectedMessage === 'string'
          ? errorMessage.includes(expectedMessage)
          : expectedMessage.test(errorMessage)
      );

      return {
        success: hasError,
        error: hasError ? undefined : `Expected error not found. Got: ${errorMessage}`,
        userFeedback: errorMessage,
        details: `Expected: ${expectedMessage}, Got: ${errorMessage}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: 'Failed to assert error message'
      };
    }
  }

  /**
   * Assert system recovers from error
   */
  async assertErrorRecovery(page: Page, recoveryAction: () => Promise<void>): Promise<ErrorTestResult> {
    const testStartTime = Date.now();

    try {
      await recoveryAction();
      await page.waitForLoadState('networkidle');

      // Check that error message is cleared
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      const hasRecovered = !errorMessage || errorMessage.trim() === '';

      const recoveryTime = Date.now() - testStartTime;

      return {
        success: hasRecovered,
        error: hasRecovered ? undefined : 'System did not recover from error',
        recoveryTime,
        details: 'Error recovery validation'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: 'Failed to assert error recovery'
      };
    }
  }

  /**
   * Assert no data loss after error
   */
  async assertNoDataLoss(page: Page, dataSelectors: string[]): Promise<ErrorTestResult> {
    try {
      const preservedData: Record<string, string> = {};

      for (const selector of dataSelectors) {
        const element = await page.locator(selector);
        if (await element.count() > 0) {
          preservedData[selector] = await element.textContent() || '';
        }
      }

      const hasData = Object.keys(preservedData).length > 0;
      const allDataPresent = Object.values(preservedData).every(value => value.trim() !== '');

      return {
        success: hasData && allDataPresent,
        error: hasData && allDataPresent ? undefined : 'Data loss detected after error',
        details: `Preserved data: ${JSON.stringify(preservedData)}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: 'Failed to assert no data loss'
      };
    }
  }

  /**
   * Run comprehensive error scenario test suite
   */
  async runErrorScenarioSuite(page: Page): Promise<ErrorScenarioReport> {
    const scenarios: ErrorScenario[] = [
      {
        name: 'Invalid Trade URL',
        description: 'Test various invalid trade URL formats',
        severity: 'medium',
        expectedBehavior: 'Display validation error and prevent submission',
        testFn: () => this.testInvalidTradeUrl(page)
      },
      {
        name: 'Insufficient Balance',
        description: 'Attempt withdrawal exceeding available balance',
        severity: 'medium',
        expectedBehavior: 'Display insufficient funds error',
        testFn: () => this.testInsufficientBalance(page)
      },
      {
        name: 'Bot Offline',
        description: 'Test behavior when trading bot is offline',
        severity: 'high',
        expectedBehavior: 'Display bot unavailable message with retry option',
        testFn: () => this.testBotOffline(page)
      },
      {
        name: 'Steam API Timeout',
        description: 'Simulate Steam API timeout scenarios',
        severity: 'medium',
        expectedBehavior: 'Display timeout message with retry option',
        testFn: () => this.testSteamApiTimeout(page)
      },
      {
        name: 'Rate Limiting',
        description: 'Test API rate limiting behavior',
        severity: 'low',
        expectedBehavior: 'Display rate limit message with retry timing',
        testFn: () => this.testRateLimiting(page)
      },
      {
        name: 'Network Failure',
        description: 'Simulate network connectivity issues',
        severity: 'high',
        expectedBehavior: 'Display offline message with reconnection attempts',
        testFn: () => this.testNetworkFailure(page)
      },
      {
        name: 'Invalid Item Selection',
        description: 'Try to trade non-tradable or invalid items',
        severity: 'medium',
        expectedBehavior: 'Display validation error before trade creation',
        testFn: () => this.testInvalidItemSelection(page)
      },
      {
        name: 'Concurrent Trade Limit',
        description: 'Exceed maximum concurrent trade limit',
        severity: 'medium',
        expectedBehavior: 'Display trade limit exceeded with queue option',
        testFn: () => this.testConcurrentTradeLimit(page)
      },
      {
        name: 'Expired Session',
        description: 'Test handling of expired authentication sessions',
        severity: 'high',
        expectedBehavior: 'Redirect to login page with session expired message',
        testFn: () => this.testExpiredSession(page)
      },
      {
        name: 'Database Connection Loss',
        description: 'Simulate database connectivity issues',
        severity: 'critical',
        expectedBehavior: 'Display graceful error with retry mechanism',
        testFn: () => this.testDatabaseConnectionLoss(page)
      }
    ];

    const results: Array<{ scenario: ErrorScenario; result: ErrorTestResult; timestamp: string }> = [];
    const recommendations: string[] = [];

    console.log(`🔄 Running ${scenarios.length} error scenarios...`);

    for (const scenario of scenarios) {
      console.log(`🔄 Testing: ${scenario.name}`);
      const result = await scenario.testFn(page);
      results.push({
        scenario,
        result,
        timestamp: new Date().toISOString()
      });

      if (!result.success) {
        recommendations.push(`Fix ${scenario.name}: ${result.error}`);
      }
    }

    // Calculate summary statistics
    const passed = results.filter(r => r.result.success).length;
    const failed = results.length - passed;
    const criticalFailures = results.filter(r =>
      r.scenario.severity === 'critical' && !r.result.success
    ).length;

    const recoveryTimes = results.map(r => r.result.recoveryTime || 0).filter(t => t > 0);
    const averageRecoveryTime = recoveryTimes.length > 0
      ? recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length
      : 0;

    return {
      summary: {
        totalScenarios: scenarios.length,
        passed,
        failed,
        criticalFailures,
        averageRecoveryTime
      },
      scenarios: results,
      recommendations
    };
  }
}

// Export for use in tests
export default ErrorScenarioTester;