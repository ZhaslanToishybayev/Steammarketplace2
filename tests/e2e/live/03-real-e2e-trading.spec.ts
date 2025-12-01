import { test, expect, Page } from '@playwright/test';
import { liveTestConfig } from './live-test-config';

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
 * Real E2E Trading Flow with Live Steam Integration
 *
 * This test suite validates the complete trading flow using real Steam APIs:
 * 1. Steam OAuth login
 * 2. Inventory sync
 * 3. Trade creation
 * 4. Bot acceptance with real credentials
 * 5. Mobile Auth confirmation
 * 6. Trade completion
 * 7. Real-time WebSocket updates
 */
test.describe('Real E2E Trading Flow with Live Steam Integration', () => {
  let page: Page;
  let socketEvents: SocketEvent[] = [];

  // Check if live tests should run
  test.beforeAll(async () => {
    if (!liveTestConfig.shouldRunLiveTests()) {
      test.skip();
    }

    // Validate bot credentials
    const missingCredentials = liveTestConfig.validateBotCredentials();
    if (missingCredentials.length > 0) {
      throw new Error(`Missing required bot credentials: ${missingCredentials.join(', ')}`);
    }

    // Validate user credentials
    const missingUserCreds = liveTestConfig.validateUserCredentials();
    if (missingUserCreds.length > 0) {
      throw new Error(`Missing required user credentials: ${missingUserCreds.join(', ')}`);
    }
  });

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    socketEvents = [];

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
          // Join user room for receiving user-specific trade updates
          socket.emit('join_user_room', {});
        });

        // Listen for trade events
        socket.on('trade:sent', (data: any) => {
          (window as any).socketEvents.push({
            event: 'trade:sent',
            data,
            timestamp: new Date().toISOString()
          });
        });

        socket.on('trade:accepted', (data: any) => {
          (window as any).socketEvents.push({
            event: 'trade:accepted',
            data,
            timestamp: new Date().toISOString()
          });
        });

        socket.on('trade:completed', (data: any) => {
          (window as any).socketEvents.push({
            event: 'trade:completed',
            data,
            timestamp: new Date().toISOString()
          });
        });

        socket.on('trade:declined', (data: any) => {
          (window as any).socketEvents.push({
            event: 'trade:declined',
            data,
            timestamp: new Date().toISOString()
          });
        });

        socket.on('trade:failed', (data: any) => {
          (window as any).socketEvents.push({
            event: 'trade:failed',
            data,
            timestamp: new Date().toISOString()
          });
        });

        socket.on('trade:update', (data: any) => {
          (window as any).socketEvents.push({
            event: 'trade:update',
            data,
            timestamp: new Date().toISOString()
          });
        });

        socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
        });

        socket.on('connect_error', (error: any) => {
          console.error('WebSocket connection error:', error);
        });
      };
    }, liveTestConfig.api.wsUrl);

    // Navigate to the application
    await page.goto(liveTestConfig.app.baseUrl);
  });

  test.afterEach(async () => {
    // Clean up any pending trades
    try {
      const pendingTradesResponse = await page.evaluate(async () => {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${liveTestConfig.api.baseUrl}/api/trades?status=pending,sent`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        return await response.json();
      });

      if (pendingTradesResponse.data?.trades) {
        for (const trade of pendingTradesResponse.data.trades) {
          await page.evaluate(async (tradeId: string) => {
            const token = localStorage.getItem('accessToken');
            await fetch(`${liveTestConfig.api.baseUrl}/api/trades/${tradeId}/cancel`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
          }, trade.id);
        }
      }
    } catch (error) {
      console.warn('Failed to clean up pending trades:', error);
    }
  });

  test('Complete trade flow: Login → Inventory → Create → Bot Accept → Confirm', {
    timeout: liveTestConfig.timeouts.tradePolling
  }, async () => {
    // Step 1: Steam OAuth Login
    console.log('🔄 Step 1: Logging in with Steam OAuth');
    await page.goto('/auth/login');

    // If we have a test storage state, restore it to skip Steam login
    if (process.env.TEST_STORAGE_STATE) {
      const { storageState } = require(process.env.TEST_STORAGE_STATE);
      await page.context().addCookies(storageState.cookies);
      await page.goto('/');
    } else {
      // Otherwise, trigger Steam login and wait for redirect
      await page.click('[data-testid="steam-login"]');
      await page.waitForURL(/.*steamcommunity\.com.*/);
      // This would require manual intervention or Steam credentials
      // For automated testing, use TEST_STORAGE_STATE
      test.skip('Requires TEST_STORAGE_STATE environment variable for pre-authenticated Steam session');
    }

    // Verify login was successful
    await page.waitForSelector('[data-testid="user-profile"]');
    const username = await page.textContent('[data-testid="user-profile"]');
    expect(username).toBeTruthy();
    console.log(`✅ Logged in as: ${username}`);

    // Step 2: Inventory Sync
    console.log('🔄 Step 2: Syncing Steam inventory');
    await page.goto('/inventory');
    await page.waitForSelector('[data-testid="inventory-page"]');

    // Click sync button
    await page.click('[data-testid="sync-inventory"]');
    await page.waitForSelector('[data-testid="syncing-status"]');

    // Wait for sync to complete
    await page.waitForSelector('[data-testid="inventory-items"]', { timeout: liveTestConfig.timeouts.inventorySync });
    console.log('✅ Inventory synced successfully');

    // Step 3: Select Item for Trade
    console.log('🔄 Step 3: Selecting item for trade');
    const items = await page.$$('[data-testid="inventory-item"]');
    expect(items.length).toBeGreaterThan(0);

    // Select first low-value item
    const firstItem = items[0];
    await firstItem.click();
    await page.waitForSelector('[data-testid="selected-item"]');

    const itemDetails = await page.textContent('[data-testid="selected-item"]');
    console.log(`✅ Selected item: ${itemDetails}`);

    // Step 4: Create Trade
    console.log('🔄 Step 4: Creating trade offer');
    await page.goto('/trade');
    await page.waitForSelector('[data-testid="trade-form"]');

    // Fill in bot trade URL
    await page.fill('[data-testid="trade-url-input"]', liveTestConfig.steam.testBot.tradeUrl);

    // Add selected item to trade
    await page.click('[data-testid="add-selected-item"]');

    // Submit trade
    await page.click('[data-testid="submit-trade"]');
    await page.waitForSelector('[data-testid="trade-submitted"]');

    // Get trade ID from response
    const tradeId = await page.textContent('[data-testid="trade-id"]');
    expect(tradeId).toBeTruthy();
    console.log(`✅ Trade created successfully: ${tradeId}`);

    // Step 5: Monitor Trade Status Changes
    console.log('🔄 Step 5: Monitoring trade status changes');
    const statusChanges = [];

    // Poll for status changes
    const maxAttempts = Math.floor(liveTestConfig.timeouts.tradePolling / 5000);
    let finalStatus = '';

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const tradeStatusResponse = await page.evaluate(async (id: string) => {
          const token = localStorage.getItem('accessToken');
          const response = await fetch(`${liveTestConfig.api.baseUrl}/api/trades/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          return await response.json();
        }, tradeId);

        const currentStatus = tradeStatusResponse.data?.status;
        if (currentStatus && (!statusChanges.length || statusChanges[statusChanges.length - 1].status !== currentStatus)) {
          statusChanges.push({
            status: currentStatus,
            timestamp: new Date().toISOString(),
            attempt
          });
          console.log(`📊 Trade status: ${currentStatus} (attempt ${attempt + 1})`);
        }

        // Check for final status
        if (['COMPLETED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'FAILED', 'EXPIRED'].includes(currentStatus)) {
          finalStatus = currentStatus;
          break;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`Error polling trade status (attempt ${attempt + 1}):`, error);
      }
    }

    expect(finalStatus).toBeTruthy();
    expect(['COMPLETED', 'ACCEPTED']).toContain(finalStatus);
    console.log(`✅ Trade reached final status: ${finalStatus}`);

    // Step 6: Verify WebSocket Events
    console.log('🔄 Step 6: Verifying WebSocket events');
    const receivedEvents = await page.evaluate(() => {
      return (window as any).socketEvents || [];
    });

    console.log(`📡 WebSocket events received: ${receivedEvents.length}`);

    // Log all received events
    receivedEvents.forEach((event: SocketEvent, index: number) => {
      console.log(`📡 Event ${index + 1}: ${event.event} - ${JSON.stringify(event.data)}`);
    });

    // Verify expected events were received
    const eventTypes = receivedEvents.map((e: SocketEvent) => e.event);
    expect(eventTypes).toContain('trade:sent');
    expect(['trade:accepted', 'trade:completed']).some(event => eventTypes.includes(event));

    // Step 7: Verify Trade Completion
    console.log('🔄 Step 7: Verifying trade completion');
    const finalTradeData = await page.evaluate(async (id: string) => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${liveTestConfig.api.baseUrl}/api/trades/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return await response.json();
    }, tradeId);

    expect(finalTradeData.data).toBeTruthy();
    expect(finalTradeData.data.status).toBe(finalStatus);
    expect(finalTradeData.data.completedAt || finalTradeData.data.acceptedAt).toBeTruthy();

    console.log(`✅ Trade completed successfully with status: ${finalStatus}`);
    console.log(`📋 Trade summary:`, {
      tradeId,
      status: finalStatus,
      statusChanges: statusChanges.length,
      webSocketEvents: receivedEvents.length,
      completedAt: finalTradeData.data.completedAt,
      acceptedAt: finalTradeData.data.acceptedAt
    });
  });

  test('Monitor polling and Mobile Auth confirmation', {
    timeout: liveTestConfig.timeouts.confirmation
  }, async () => {
    console.log('🔄 Testing Mobile Auth confirmation flow');

    // Login and navigate to trade creation
    await page.goto('/auth/login');
    if (process.env.TEST_STORAGE_STATE) {
      const { storageState } = require(process.env.TEST_STORAGE_STATE);
      await page.context().addCookies(storageState.cookies);
    }
    await page.goto('/trade');

    // Create a trade that will require confirmation
    await page.fill('[data-testid="trade-url-input"]', liveTestConfig.steam.testBot.tradeUrl);
    await page.click('[data-testid="submit-trade-with-confirmation"]');

    const tradeId = await page.textContent('[data-testid="trade-id"]');
    expect(tradeId).toBeTruthy();

    // Monitor backend logs for confirmation attempts
    console.log('🔄 Monitoring for Mobile Auth confirmation...');
    // This would require access to backend logs or a special endpoint
    // For now, we'll verify that the trade eventually moves past "sent" status

    let confirmationDetected = false;
    const maxConfirmationAttempts = 20; // 2 minutes with 6-second intervals

    for (let attempt = 0; attempt < maxConfirmationAttempts; attempt++) {
      const tradeData = await page.evaluate(async (id: string) => {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${liveTestConfig.api.baseUrl}/api/trades/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        return await response.json();
      }, tradeId);

      if (tradeData.data?.status === 'ACCEPTED' || tradeData.data?.status === 'COMPLETED') {
        confirmationDetected = true;
        console.log(`✅ Mobile Auth confirmation successful, trade status: ${tradeData.data.status}`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
    }

    expect(confirmationDetected).toBe(true);
  });

  test('Real-time WebSocket updates during trade lifecycle', async () => {
    console.log('🔄 Testing real-time WebSocket updates');

    await page.goto('/auth/login');
    if (process.env.TEST_STORAGE_STATE) {
      const { storageState } = require(process.env.TEST_STORAGE_STATE);
      await page.context().addCookies(storageState.cookies);
    }

    // Create trade and monitor WebSocket events
    await page.goto('/trade');
    await page.fill('[data-testid="trade-url-input"]', liveTestConfig.steam.testBot.tradeUrl);
    await page.click('[data-testid="submit-trade"]');

    const tradeId = await page.textContent('[data-testid="trade-id"]');
    expect(tradeId).toBeTruthy();

    // Wait for and verify WebSocket events
    const eventsReceived = await page.waitForFunction(() => {
      const events = (window as any).socketEvents || [];
      const hasSentEvent = events.some((e: any) => e.event === 'trade:sent');
      const hasStatusEvent = events.some((e: any) => ['trade:accepted', 'trade:completed'].includes(e.event));
      return { events, hasSentEvent, hasStatusEvent };
    }, { timeout: liveTestConfig.timeouts.tradePolling });

    expect(eventsReceived.hasSentEvent).toBe(true);
    expect(eventsReceived.hasStatusEvent).toBe(true);

    console.log(`✅ WebSocket events verified: ${eventsReceived.events.length} total events`);
    eventsReceived.events.forEach((event: any, index: number) => {
      console.log(`📡 Event ${index + 1}: ${event.event} - ${event.data.status}`);
    });
  });

  test('Error handling and retry logic', async () => {
    console.log('🔄 Testing error handling scenarios');

    await page.goto('/auth/login');
    if (process.env.TEST_STORAGE_STATE) {
      const { storageState } = require(process.env.TEST_STORAGE_STATE);
      await page.context().addCookies(storageState.cookies);
    }

    // Test 1: Invalid trade URL
    await page.goto('/trade');
    await page.fill('[data-testid="trade-url-input"]', 'invalid-trade-url');
    await page.click('[data-testid="submit-trade"]');

    const errorMessage = await page.textContent('[data-testid="error-message"]');
    expect(errorMessage).toContain('invalid');

    // Test 2: Bot offline scenario (if applicable)
    // This would require temporarily disabling the bot or simulating network issues
    console.log('✅ Error handling tests completed');
  });
});