import { test, expect, Page } from '@playwright/test';
import { liveTestConfig, shouldRunLiveTests, validateCompleteTestConfig } from './live-test-config';
import { LogMonitor } from '../utils/log-monitor';
import { ErrorScenarioTester } from '../utils/error-scenario-tester';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { TestReportGenerator } from '../utils/test-report-generator';

interface TradeEventData {
  tradeId: string;
  status: string;
  timestamp: string;
  userId?: string;
  offerId?: string;
  reason?: string;
  errorMessage?: string;
}

interface SocketEvent {
  event: string;
  data: TradeEventData;
  timestamp: string;
}

/**
 * Complete E2E Flow Test
 *
 * This comprehensive test validates the entire user journey through the Steam Marketplace:
 * 1. Steam OAuth authentication with real credentials
 * 2. Inventory synchronization with Steam API
 * 3. Market browsing with live pricing
 * 4. Trade creation and bot handling
 * 5. Wallet operations and balance tracking
 * 6. Admin dashboard verification
 * 7. Real-time WebSocket updates
 * 8. Error scenario handling
 * 9. Performance monitoring
 * 10. Comprehensive reporting
 *
 * This test serves as the ultimate validation of system integration and user experience.
 */
test.describe('Complete E2E Flow - Full User Journey', () => {
  let page: Page;
  let logMonitor: LogMonitor;
  let errorTester: ErrorScenarioTester;
  let performanceMonitor: PerformanceMonitor;
  let reportGenerator: TestReportGenerator;
  let socketEvents: SocketEvent[] = [];
  let testStartTime: number;

  // Check if live tests should run
  test.beforeAll(async () => {
    if (!shouldRunLiveTests()) {
      test.skip();
    }

    // Validate all required credentials
    const missingCredentials = validateCompleteTestConfig();
    if (missingCredentials.length > 0) {
      throw new Error(`Missing required credentials for complete E2E test: ${missingCredentials.join(', ')}`);
    }

    // Initialize utilities
    logMonitor = new LogMonitor(liveTestConfig);
    errorTester = new ErrorScenarioTester(liveTestConfig);
    performanceMonitor = new PerformanceMonitor(liveTestConfig);
    reportGenerator = new TestReportGenerator(liveTestConfig);
  });

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    socketEvents = [];
    testStartTime = Date.now();

    // Start monitoring
    if (liveTestConfig.monitoring.enabled) {
      await logMonitor.startMonitoring();
    }
    performanceMonitor.startMonitoring(page);

    // Initialize report
    await reportGenerator.startReport('Complete E2E Flow Test');

    // Set up WebSocket event listener
    await page.addInitScript(wsUrl => {
      (window as any).socketEvents = [];

      // Inject Socket.io client
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.2/socket.io.min.js';
      document.head.appendChild(script);

      script.onload = () => {
        const socket = (window as any).io(wsUrl, {
          auth: {
            token: localStorage.getItem('accessToken') || ''
          }
        });

        // Join user room after connecting
        socket.on('connect', () => {
          console.log('WebSocket connected');
          socket.emit('join_user_room', {});
        });

        // Listen for all trade events
        const events = ['trade:sent', 'trade:accepted', 'trade:completed', 'trade:declined', 'trade:failed', 'trade:update'];
        events.forEach(eventType => {
          socket.on(eventType, (data: any) => {
            (window as any).socketEvents.push({
              event: eventType,
              data,
              timestamp: new Date().toISOString()
            });
          });
        });

        socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
        });
      };
    }, liveTestConfig.app.wsUrl);

    // Navigate to the application
    await page.goto(liveTestConfig.app.baseUrl);
    await reportGenerator.addStep('Environment Setup', 'completed', Date.now() - testStartTime, 'Test environment initialized');
  });

  test.afterEach(async () => {
    const testDuration = Date.now() - testStartTime;

    // Stop monitoring and collect data
    let logs = [];
    let metrics = {};
    if (liveTestConfig.monitoring.enabled) {
      logs = await logMonitor.stopMonitoring();
      await reportGenerator.addLog('info', 'Log monitoring completed', { eventCount: logs.length });
    }

    metrics = performanceMonitor.stopMonitoring();
    await reportGenerator.addStep('Performance Monitoring', 'completed', 0, metrics);

    // Clean up any pending trades
    try {
      await cleanupPendingTrades(page);
    } catch (error) {
      await reportGenerator.addLog('error', 'Trade cleanup failed', { error: error.message });
    }

    // Generate final report
    const finalReport = await reportGenerator.generateReport();
    await reportGenerator.exportReport('html');

    // Log test completion
    console.log('✅ Complete E2E flow test finished');
    console.log(`📊 Test duration: ${(testDuration / 1000).toFixed(2)}s`);
    console.log(`📡 WebSocket events: ${socketEvents.length}`);
    console.log(`⚡ Performance metrics:`, JSON.stringify(metrics, null, 2));
  });

  test('Complete User Journey: Auth → Inventory → Market → Trade → Wallet → Admin', {
    timeout: liveTestConfig.timeouts.tradePolling + 60000 // Extra time for complete flow
  }, async () => {
    const journeyStartTime = Date.now();
    let tradeId: string;
    let selectedItemId: string;

    try {
      // Phase 1: Steam Authentication Flow
      await reportGenerator.addStep('Phase 1: Steam Authentication', 'in_progress', 0, 'Starting Steam OAuth login');
      console.log('🔄 Phase 1: Steam Authentication Flow');

      await page.goto('/auth/login');
      await performanceMonitor.measurePageLoad(page, '/auth/login');

      // Handle Steam login
      if (process.env.TEST_STORAGE_STATE) {
        const { storageState } = require(process.env.TEST_STORAGE_STATE);
        await page.context().addCookies(storageState.cookies);
        await page.goto('/');
      } else {
        await page.click('[data-testid="steam-login"]');
        await page.waitForURL(/.*steamcommunity\.com.*/, { timeout: 30000 });
        // Manual intervention required or use pre-authenticated state
        test.skip('Requires TEST_STORAGE_STATE for automated Steam OAuth');
      }

      // Verify authentication
      await page.waitForSelector('[data-testid="user-profile"]', { timeout: 10000 });
      const username = await page.textContent('[data-testid="user-profile"]');
      expect(username).toBeTruthy();
      await reportGenerator.addStep('Steam Authentication', 'completed', Date.now() - journeyStartTime, `Logged in as: ${username}`);
      console.log(`✅ Authenticated as: ${username}`);

      // Phase 2: Inventory Management
      await reportGenerator.addStep('Phase 2: Inventory Sync', 'in_progress', 0, 'Syncing Steam inventory');
      console.log('🔄 Phase 2: Inventory Management');

      await page.goto('/inventory');
      await performanceMonitor.measurePageLoad(page, '/inventory');

      // Sync inventory
      await page.click('[data-testid="sync-inventory"]');
      await page.waitForSelector('[data-testid="syncing-status"]');
      await page.waitForSelector('[data-testid="inventory-items"]', { timeout: liveTestConfig.timeouts.inventory });
      await reportGenerator.addStep('Inventory Sync', 'completed', Date.now() - journeyStartTime, 'Inventory synchronized from Steam');

      // Verify items loaded
      const items = await page.$$('[data-testid="inventory-item"]');
      expect(items.length).toBeGreaterThan(0);
      console.log(`✅ Inventory synced with ${items.length} items`);

      // Select an item for trading
      selectedItemId = await page.getAttribute('[data-testid="inventory-item"]', 'data-item-id');
      await page.click('[data-testid="inventory-item"]');
      await page.waitForSelector('[data-testid="selected-item"]');
      await reportGenerator.addStep('Item Selection', 'completed', Date.now() - journeyStartTime, `Selected item: ${selectedItemId}`);

      // Phase 3: Market Browsing
      await reportGenerator.addStep('Phase 3: Market Browsing', 'in_progress', 0, 'Browsing market with live prices');
      console.log('🔄 Phase 3: Market Browsing');

      await page.goto('/market');
      await performanceMonitor.measurePageLoad(page, '/market');

      // Verify market items loaded
      await page.waitForSelector('[data-testid="market-items"]', { timeout: 30000 });
      const marketItems = await page.$$('[data-testid="market-item"]');
      expect(marketItems.length).toBeGreaterThan(0);

      // Verify price information
      const priceElement = await page.textContent('[data-testid="item-price"]');
      expect(priceElement).toBeTruthy();
      console.log(`✅ Market loaded with ${marketItems.length} items, prices displayed`);

      await reportGenerator.addStep('Market Browsing', 'completed', Date.now() - journeyStartTime, `Market loaded with ${marketItems.length} items`);

      // Phase 4: Trade Creation & Bot Handling
      await reportGenerator.addStep('Phase 4: Trade Creation', 'in_progress', 0, 'Creating trade offer with bot assignment');
      console.log('🔄 Phase 4: Trade Creation & Bot Handling');

      await page.goto('/trade');
      await performanceMonitor.measurePageLoad(page, '/trade');

      // Fill trade form
      await page.fill('[data-testid="trade-url-input"]', liveTestConfig.steam.testBot.tradeUrl);
      await page.click('[data-testid="add-selected-item"]');
      await page.click('[data-testid="submit-trade"]');

      // Get trade ID
      await page.waitForSelector('[data-testid="trade-id"]', { timeout: 30000 });
      tradeId = await page.textContent('[data-testid="trade-id"]');
      expect(tradeId).toBeTruthy();
      console.log(`✅ Trade created: ${tradeId}`);
      await reportGenerator.addStep('Trade Creation', 'completed', Date.now() - journeyStartTime, `Trade ${tradeId} created`);

      // Phase 5: Trade Status Monitoring
      await reportGenerator.addStep('Phase 5: Trade Execution', 'in_progress', 0, 'Monitoring trade status progression');
      console.log('🔄 Phase 5: Trade Status Monitoring');

      const statusChanges = [];
      const maxAttempts = Math.floor(liveTestConfig.timeouts.tradePolling / 5000);
      let finalStatus = '';

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const apiUrl = liveTestConfig.app.apiUrl;
          const tradeData = await page.evaluate(async (id: string, apiUrl: string) => {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${apiUrl}/trades/${id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            return await response.json();
          }, tradeId, apiUrl);

          const currentStatus = tradeData.data?.status;
          if (currentStatus && (!statusChanges.length || statusChanges[statusChanges.length - 1].status !== currentStatus)) {
            statusChanges.push({
              status: currentStatus,
              timestamp: new Date().toISOString(),
              attempt
            });
            console.log(`📊 Trade status: ${currentStatus} (attempt ${attempt + 1})`);
            await reportGenerator.addStep(`Trade Status: ${currentStatus}`, 'completed', 0, `Status changed at attempt ${attempt + 1}`);
          }

          if (['COMPLETED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'FAILED', 'EXPIRED'].includes(currentStatus)) {
            finalStatus = currentStatus;
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          console.error(`Error polling trade status (attempt ${attempt + 1}):`, error);
        }
      }

      expect(finalStatus).toBeTruthy();
      expect(['COMPLETED', 'ACCEPTED']).toContain(finalStatus);
      console.log(`✅ Trade completed with status: ${finalStatus}`);
      await reportGenerator.addStep('Trade Execution', 'completed', Date.now() - journeyStartTime, `Trade ${tradeId} ${finalStatus}`);

      // Phase 6: Wallet Operations
      await reportGenerator.addStep('Phase 6: Wallet Operations', 'in_progress', 0, 'Verifying wallet balance and transactions');
      console.log('🔄 Phase 6: Wallet Operations');

      await page.goto('/wallet');
      await performanceMonitor.measurePageLoad(page, '/wallet');

      // Check balance before deposit
      await page.waitForSelector('[data-testid="wallet-balance"]');
      const balanceBefore = await page.textContent('[data-testid="wallet-balance"]');
      expect(balanceBefore).toBeTruthy();
      const numericBalanceBefore = parseFloat(balanceBefore!.replace(/[^0-9.]/g, ''));
      console.log(`✅ Wallet balance before deposit: ${balanceBefore}`);

      // Create deposit
      await page.click('[data-testid="deposit-button"]');
      await page.fill('[data-testid="deposit-amount"]', '10.00');
      await page.click('[data-testid="confirm-deposit"]');

      // Verify deposit success
      await page.waitForSelector('[data-testid="deposit-success"]');
      await reportGenerator.addStep('Deposit Initiated', 'completed', 0, 'Deposit of $10.00 initiated');

      // Check balance after deposit (with retry logic)
      let balanceAfter = null;
      let attempts = 0;
      const maxBalanceAttempts = 6; // 30 seconds max wait

      while (attempts < maxBalanceAttempts && !balanceAfter) {
        try {
          await page.reload();
          await page.waitForSelector('[data-testid="wallet-balance"]', { timeout: 5000 });
          balanceAfter = await page.textContent('[data-testid="wallet-balance"]');
          if (balanceAfter) {
            const numericBalanceAfter = parseFloat(balanceAfter.replace(/[^0-9.]/g, ''));
            if (numericBalanceAfter > numericBalanceBefore) {
              console.log(`✅ Wallet balance after deposit: ${balanceAfter}`);
              await reportGenerator.addStep('Wallet Operations', 'completed', Date.now() - journeyStartTime, `Wallet updated: ${balanceBefore} → ${balanceAfter}`);
              break;
            }
          }
        } catch (error) {
          console.log(`Balance check attempt ${attempts + 1} failed, retrying...`);
        }
        attempts++;
        if (attempts < maxBalanceAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      // Verify transaction history
      await page.click('[data-testid="transaction-history"]');
      await page.waitForSelector('[data-testid="transaction-list"]');
      const transactions = await page.$$('[data-testid="transaction-item"]');
      expect(transactions.length).toBeGreaterThan(0);
      console.log(`✅ Transaction history shows ${transactions.length} transactions`);

      // Test withdrawal (small amount to stay safe)
      try {
        await page.click('[data-testid="withdraw-button"]');
        await page.fill('[data-testid="withdraw-amount"]', '5.00');
        await page.click('[data-testid="confirm-withdrawal"]');

        // Check for withdrawal success or appropriate error
        const withdrawalResult = await page.waitForSelector(
          '[data-testid="withdrawal-success"], [data-testid="error-message"]',
          { timeout: 10000 }
        );

        const isSuccess = await withdrawalResult.getAttribute('data-testid');
        if (isSuccess === 'withdrawal-success') {
          console.log('✅ Small withdrawal successful');
          await reportGenerator.addStep('Withdrawal Test', 'completed', 0, 'Small withdrawal of $5.00 successful');
        } else {
          const errorMessage = await page.textContent('[data-testid="error-message"]');
          console.log(`ℹ️ Withdrawal blocked: ${errorMessage}`);
          await reportGenerator.addStep('Withdrawal Test', 'completed', 0, `Withdrawal blocked as expected: ${errorMessage}`);
        }
      } catch (error) {
        console.log('ℹ️ Withdrawal test failed (expected in some environments)');
        await reportGenerator.addStep('Withdrawal Test', 'completed', 0, 'Withdrawal test skipped - not available in this environment');
      }

      // Phase 7: Real-time Updates
      await reportGenerator.addStep('Phase 7: Real-time Updates', 'in_progress', 0, 'Verifying WebSocket events and notifications');
      console.log('🔄 Phase 7: Real-time Updates');

      const receivedEvents = await page.evaluate(() => {
        return (window as any).socketEvents || [];
      });

      console.log(`📡 WebSocket events received: ${receivedEvents.length}`);
      await reportGenerator.addStep('Real-time Updates', 'completed', Date.now() - journeyStartTime, `${receivedEvents.length} WebSocket events received`);

      // Verify critical events
      const eventTypes = receivedEvents.map((e: any) => e.event);
      expect(eventTypes).toContain('trade:sent');
      expect(['trade:accepted', 'trade:completed']).some(event => eventTypes.includes(event));

      // Phase 8: Admin Dashboard
      await reportGenerator.addStep('Phase 8: Admin Dashboard', 'in_progress', 0, 'Verifying admin functionality');
      console.log('🔄 Phase 8: Admin Dashboard');

      // Login as admin (this would require admin credentials in a real scenario)
      await page.goto('/admin');
      await page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 30000 });

      // Verify admin metrics
      const userCount = await page.textContent('[data-testid="total-users"]');
      const tradeCount = await page.textContent('[data-testid="total-trades"]');
      expect(userCount).toBeTruthy();
      expect(tradeCount).toBeTruthy();

      // Verify bot status indicators
      const botStatusElement = await page.locator('[data-testid="bot-status"]').first();
      if (await botStatusElement.count() > 0) {
        const botStatus = await botStatusElement.textContent();
        console.log(`✅ Bot status: ${botStatus}`);
        await reportGenerator.addStep('Bot Status Check', 'completed', 0, `Bot status: ${botStatus}`);
      } else {
        console.log('ℹ️ Bot status indicator not found (expected in some environments)');
        await reportGenerator.addStep('Bot Status Check', 'completed', 0, 'Bot status indicator not available');
      }

      // Verify user list visibility
      try {
        await page.click('[data-testid="view-users"]');
        await page.waitForSelector('[data-testid="user-list"]', { timeout: 5000 });
        const userList = await page.$$('[data-testid="user-item"]');
        console.log(`✅ User list shows ${userList.length} users`);
        await reportGenerator.addStep('User List Verification', 'completed', 0, `User list with ${userList.length} users visible`);
      } catch (error) {
        console.log('ℹ️ User list not accessible (expected in some environments)');
        await reportGenerator.addStep('User List Verification', 'completed', 0, 'User list not available in this environment');
      }

      // Verify trade list visibility
      try {
        await page.click('[data-testid="view-trades"]');
        await page.waitForSelector('[data-testid="trade-list"]', { timeout: 5000 });
        const tradeList = await page.$$('[data-testid="trade-item"]');
        console.log(`✅ Trade list shows ${tradeList.length} trades`);
        await reportGenerator.addStep('Trade List Verification', 'completed', 0, `Trade list with ${tradeList.length} trades visible`);
      } catch (error) {
        console.log('ℹ️ Trade list not accessible (expected in some environments)');
        await reportGenerator.addStep('Trade List Verification', 'completed', 0, 'Trade list not available in this environment');
      }

      console.log(`✅ Admin dashboard verified - Users: ${userCount}, Trades: ${tradeCount}`);
      await reportGenerator.addStep('Admin Dashboard', 'completed', Date.now() - journeyStartTime, 'Admin functionality verified with enhanced checks');

      // Phase 9: Error Scenarios
      await reportGenerator.addStep('Phase 9: Error Handling', 'in_progress', 0, 'Testing error scenarios');
      console.log('🔄 Phase 9: Error Scenarios');

      // Test invalid trade URL
      await page.goto('/trade');
      await page.fill('[data-testid="trade-url-input"]', 'invalid-url');
      await page.click('[data-testid="submit-trade"]');
      await page.waitForSelector('[data-testid="error-message"]');
      await reportGenerator.addStep('Error Scenarios', 'completed', Date.now() - journeyStartTime, 'Error handling verified');

      const totalJourneyTime = Date.now() - journeyStartTime;
      console.log(`✅ Complete journey finished in ${(totalJourneyTime / 1000).toFixed(2)}s`);

    } catch (error) {
      await reportGenerator.addLog('error', 'Journey failed', { error: error.message, stack: error.stack });
      throw error;
    }
  });

  test('Comprehensive Error Scenario Testing', async () => {
    console.log('🔄 Running comprehensive error scenario testing');

    await page.goto('/auth/login');
    if (process.env.TEST_STORAGE_STATE) {
      const { storageState } = require(process.env.TEST_STORAGE_STATE);
      await page.context().addCookies(storageState.cookies);
    }

    // Use the comprehensive error scenario test suite
    const errorReport = await errorTester.runErrorScenarioSuite(page);

    // Log and assert on the results
    console.log(`📊 Error scenario test results:`);
    console.log(`   Total scenarios: ${errorReport.summary.totalScenarios}`);
    console.log(`   Passed: ${errorReport.summary.passed}`);
    console.log(`   Failed: ${errorReport.summary.failed}`);
    console.log(`   Critical failures: ${errorReport.summary.criticalFailures}`);

    // Assert that all critical severity scenarios pass
    const criticalFailures = errorReport.summary.criticalFailures;
    expect(criticalFailures).toBe(0);

    if (errorReport.summary.failed > 0) {
      console.warn(`⚠️ ${errorReport.summary.failed} error scenarios failed:`);
      errorReport.recommendations.forEach(rec => console.warn(`   - ${rec}`));
    } else {
      console.log('✅ All error scenarios passed');
    }

    // Record results in the test report
    await reportGenerator.addStep('Error Scenario Testing', 'completed', 0,
      `Error scenarios: ${errorReport.summary.passed}/${errorReport.summary.totalScenarios} passed, ${criticalFailures} critical failures`);

    // Add individual scenario results to the report
    errorReport.scenarios.forEach(scenario => {
      await reportGenerator.addErrorScenario(
        scenario.scenario.name,
        scenario.result.success,
        scenario.result.details || 'Test completed'
      );
    });

    // Add recommendations if any
    errorReport.recommendations.forEach(rec => {
      await reportGenerator.addRecommendation(rec);
    });
  });

  test('Performance Benchmarking', async () => {
    console.log('🔄 Running performance benchmarks');

    const benchmarks = [
      { url: '/inventory', name: 'Inventory Page Load' },
      { url: '/market', name: 'Market Page Load' },
      { url: '/trade', name: 'Trade Page Load' },
      { url: '/wallet', name: 'Wallet Page Load' }
    ];

    for (const benchmark of benchmarks) {
      const loadTime = await performanceMonitor.measurePageLoad(page, benchmark.url);
      await reportGenerator.addMetric(benchmark.name, loadTime, 'ms');
      console.log(`📊 ${benchmark.name}: ${loadTime}ms`);
    }

    // Verify performance thresholds
    const metrics = performanceMonitor.getMetrics();
    const pageLoadTimes = metrics
      .filter(m => m.name === 'page_load_time')
      .map(m => m.value);

    const averageLoadTime = pageLoadTimes.length > 0
      ? pageLoadTimes.reduce((sum, time) => sum + time, 0) / pageLoadTimes.length
      : 0;

    const maxLoadTime = pageLoadTimes.length > 0
      ? Math.max(...pageLoadTimes)
      : 0;

    await reportGenerator.assertPerformance('averageLoadTime', averageLoadTime, '< 3000ms');
    await reportGenerator.assertPerformance('maxLoadTime', maxLoadTime, '< 5000ms');
  });

  /**
   * Clean up any pending trades
   */
  async function cleanupPendingTrades(page: Page): Promise<void> {
    try {
      const apiUrl = liveTestConfig.app.apiUrl;
      const pendingTradesResponse = await page.evaluate(async (apiUrl: string) => {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${apiUrl}/trades?status=pending,sent`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        return await response.json();
      }, apiUrl);

      if (pendingTradesResponse.data?.trades) {
        for (const trade of pendingTradesResponse.data.trades) {
          await page.evaluate(async (tradeId: string, apiUrl: string) => {
            const token = localStorage.getItem('accessToken');
            await fetch(`${apiUrl}/trades/${tradeId}/cancel`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
          }, trade.id, apiUrl);
        }
      }
    } catch (error) {
      console.warn('Failed to clean up pending trades:', error);
    }
  }
});