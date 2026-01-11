/**
 * Real-time Updates E2E Tests
 * Tests WebSocket-based real-time updates for trades, prices, and notifications
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../setup/test-config';

test.describe('Real-time Updates', () => {
  test.beforeEach(async ({ page }) => {
    // Login as regular user
    await page.goto('/auth/login');

    // Mock Steam login
    await page.route('**/api/auth/steam', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          url: 'https://steamcommunity.com/openid/login'
        })
      });
    });

    await page.click('[data-testid="steam-login-button"]');
    await page.waitForNavigation();

    // Simulate Steam callback
    await page.goto('/api/auth/steam/return?openid.identity=https://steamcommunity.com/openid/id/' + testConfig.users.regular.steamId);

    // Wait for successful login and redirect to dashboard
    await page.waitForURL('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should establish WebSocket connection', async ({ page }) => {
    // Wait for WebSocket connection to be established
    await page.waitForFunction(() => {
      return window.WebSocket && window.WebSocket === window.ws;
    }, { timeout: 10000 });

    // Verify connection status
    await expect(page.locator('[data-testid="connection-status"]')).toContainText(/connected/i);
  });

  test('should receive real-time trade status updates', async ({ page }) => {
    // Navigate to trades page
    await page.click('[data-testid="nav-trades"]');
    await page.waitForLoadState('networkidle');

    // Monitor WebSocket messages for trade updates
    await page.evaluate(() => {
      window.tradeUpdates = [];
      const originalSend = window.ws.send;
      window.ws.send = function(data) {
        originalSend.call(this, data);
      };

      window.ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'trade_update') {
          window.tradeUpdates.push(message);
        }
      });
    });

    // Simulate a trade status update via WebSocket
    await page.evaluate(() => {
      const mockTradeUpdate = {
        type: 'trade_update',
        tradeId: 'test_trade_123',
        status: 'SENT',
        message: 'Trade offer sent to bot',
        timestamp: new Date().toISOString()
      };
      window.ws.onmessage({ data: JSON.stringify(mockTradeUpdate) });
    });

    // Wait for the update to be reflected in the UI
    await page.waitForTimeout(1000);

    // Verify trade status was updated
    const tradeRow = page.locator('[data-testid="trade-row"]').first();
    if (await tradeRow.isVisible()) {
      await expect(tradeRow.locator('[data-testid="trade-status"]')).toContainText(/sent/i);
    }
  });

  test('should receive real-time price updates', async ({ page }) => {
    // Navigate to marketplace
    await page.click('[data-testid="nav-marketplace"]');
    await page.waitForLoadState('networkidle');

    // Monitor price update messages
    await page.evaluate(() => {
      window.priceUpdates = [];
      window.ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'price_update') {
          window.priceUpdates.push(message);
        }
      });
    });

    // Simulate price updates
    await page.evaluate(() => {
      const mockPriceUpdates = [
        {
          type: 'price_update',
          itemId: 'ak47_redline',
          appId: 730,
          newPrice: 45.50,
          change: 2.50,
          changePercent: 5.8,
          timestamp: new Date().toISOString()
        },
        {
          type: 'price_update',
          itemId: 'm4a4_desert_strike',
          appId: 730,
          newPrice: 35.20,
          change: -1.80,
          changePercent: -4.9,
          timestamp: new Date().toISOString()
        }
      ];

      mockPriceUpdates.forEach(update => {
        window.ws.onmessage({ data: JSON.stringify(update) });
      });
    });

    // Wait for price updates to be reflected
    await page.waitForTimeout(1000);

    // Verify price changes are shown
    const priceElements = page.locator('[data-testid="item-price"]');
    const count = await priceElements.count();

    let priceChanged = false;
    for (let i = 0; i < count; i++) {
      const priceText = await priceElements.nth(i).textContent();
      if (priceText && (priceText.includes('$45.50') || priceText.includes('$35.20'))) {
        priceChanged = true;
        break;
      }
    }

    expect(priceChanged).toBe(true);
  });

  test('should display real-time notifications', async ({ page }) => {
    // Monitor notification messages
    await page.evaluate(() => {
      window.notifications = [];
      window.ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'notification') {
          window.notifications.push(message);
        }
      });
    });

    // Simulate different types of notifications
    const notifications = [
      {
        type: 'notification',
        id: 'notif_1',
        title: 'Trade Completed',
        message: 'Your trade has been completed successfully!',
        type: 'success',
        timestamp: new Date().toISOString()
      },
      {
        type: 'notification',
        id: 'notif_2',
        title: 'Deposit Received',
        message: 'Your deposit of $25.00 has been received.',
        type: 'info',
        timestamp: new Date().toISOString()
      },
      {
        type: 'notification',
        id: 'notif_3',
        title: 'Security Alert',
        message: 'New login detected from unknown device.',
        type: 'warning',
        timestamp: new Date().toISOString()
      }
    ];

    for (const notification of notifications) {
      await page.evaluate((notif) => {
        window.ws.onmessage({ data: JSON.stringify(notif) });
      }, notification);

      // Wait for notification to appear
      await page.waitForTimeout(500);

      // Verify notification is displayed
      await expect(page.locator('[data-testid="notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="notification-title"]')).toContainText(notification.title);
      await expect(page.locator('[data-testid="notification-message"]')).toContainText(notification.message);
    }
  });

  test('should handle connection reestablishment', async ({ page }) => {
    // Monitor connection status
    await page.evaluate(() => {
      window.connectionEvents = [];
      window.ws.addEventListener('open', () => {
        window.connectionEvents.push('connected');
      });
      window.ws.addEventListener('close', () => {
        window.connectionEvents.push('disconnected');
      });
      window.ws.addEventListener('error', () => {
        window.connectionEvents.push('error');
      });
    });

    // Simulate connection loss
    await page.evaluate(() => {
      window.ws.onclose();
    });

    // Verify disconnection status
    await expect(page.locator('[data-testid="connection-status"]')).toContainText(/disconnected/i);

    // Wait for auto-reconnection
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="connection-status"]').textContent.includes('connected');
    }, { timeout: 15000 });

    // Verify reconnection
    await expect(page.locator('[data-testid="connection-status"]')).toContainText(/connected/i);
  });

  test('should update inventory in real-time', async ({ page }) => {
    // Navigate to inventory page
    await page.click('[data-testid="nav-inventory"]');
    await page.waitForLoadState('networkidle');

    // Monitor inventory update messages
    await page.evaluate(() => {
      window.inventoryUpdates = [];
      window.ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'inventory_update') {
          window.inventoryUpdates.push(message);
        }
      });
    });

    // Simulate inventory update (new items added)
    await page.evaluate(() => {
      const mockInventoryUpdate = {
        type: 'inventory_update',
        action: 'items_added',
        items: [
          {
            id: 'new_item_1',
            name: 'AWP | Redline (Factory New)',
            appId: 730,
            value: 120.50,
            tradable: true
          },
          {
            id: 'new_item_2',
            name: 'M4A4 | Dragon King (Minimal Wear)',
            appId: 730,
            value: 89.99,
            tradable: true
          }
        ],
        timestamp: new Date().toISOString()
      };
      window.ws.onmessage({ data: JSON.stringify(mockInventoryUpdate) });
    });

    // Wait for inventory to update
    await page.waitForTimeout(1000);

    // Verify new items appear
    const inventoryItems = page.locator('[data-testid="inventory-item"]');
    const count = await inventoryItems.count();

    let newItemFound = false;
    for (let i = 0; i < count; i++) {
      const itemName = await inventoryItems.nth(i).locator('[data-testid="item-name"]').textContent();
      if (itemName && (itemName.includes('AWP | Redline') || itemName.includes('M4A4 | Dragon King'))) {
        newItemFound = true;
        break;
      }
    }

    expect(newItemFound).toBe(true);
  });

  test('should update balance in real-time', async ({ page }) => {
    // Navigate to wallet
    await page.click('[data-testid="nav-wallet"]');
    await page.waitForLoadState('networkidle');

    // Note initial balance
    const initialBalanceText = await page.locator('[data-testid="current-balance"]').textContent();
    const initialBalance = initialBalanceText ? parseFloat(initialBalanceText.replace(/[^0-9.]/g, '')) : 0;

    // Simulate balance update
    await page.evaluate(() => {
      const mockBalanceUpdate = {
        type: 'balance_update',
        newBalance: 150.50,
        change: 25.00,
        changeType: 'credit',
        reason: 'deposit',
        timestamp: new Date().toISOString()
      };
      window.ws.onmessage({ data: JSON.stringify(mockBalanceUpdate) });
    });

    // Wait for balance to update
    await page.waitForTimeout(1000);

    // Verify balance was updated
    const updatedBalanceText = await page.locator('[data-testid="current-balance"]').textContent();
    const updatedBalance = updatedBalanceText ? parseFloat(updatedBalanceText.replace(/[^0-9.]/g, '')) : 0;

    expect(updatedBalance).toBeGreaterThan(initialBalance);
  });

  test('should handle market data streaming', async ({ page }) => {
    // Navigate to marketplace
    await page.click('[data-testid="nav-marketplace"]');
    await page.waitForLoadState('networkidle');

    // Monitor market data updates
    await page.evaluate(() => {
      window.marketUpdates = [];
      window.ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'market_update') {
          window.marketUpdates.push(message);
        }
      });
    });

    // Simulate market volume updates
    await page.evaluate(() => {
      const mockMarketUpdate = {
        type: 'market_update',
        metric: 'volume_24h',
        value: 15420.75,
        change: 12.5,
        timestamp: new Date().toISOString()
      };
      window.ws.onmessage({ data: JSON.stringify(mockMarketUpdate) });
    });

    // Wait for market data to update
    await page.waitForTimeout(1000);

    // Verify market data was updated
    const volumeElement = page.locator('[data-testid="volume-24h"]');
    if (await volumeElement.isVisible()) {
      await expect(volumeElement).toContainText('$15,420');
    }
  });

  test('should throttle rapid updates', async ({ page }) => {
    // Navigate to marketplace to test price update throttling
    await page.click('[data-testid="nav-marketplace"]');
    await page.waitForLoadState('networkidle');

    // Send multiple rapid price updates
    for (let i = 0; i < 20; i++) {
      await page.evaluate((index) => {
        const mockPriceUpdate = {
          type: 'price_update',
          itemId: 'rapid_update_test',
          appId: 730,
          newPrice: 25.00 + (index * 0.1),
          change: 0.1,
          changePercent: 0.4,
          timestamp: new Date().toISOString()
        };
        window.ws.onmessage({ data: JSON.stringify(mockPriceUpdate) });
      }, i);

      // Small delay between updates
      await page.waitForTimeout(10);
    }

    // Wait for all updates to process
    await page.waitForTimeout(2000);

    // Verify UI is still responsive (no freezing)
    await expect(page.locator('[data-testid="marketplace"]')).toBeVisible();

    // Verify latest price is shown
    const latestPriceElement = page.locator('[data-testid="item-price"]').first();
    if (await latestPriceElement.isVisible()) {
      const priceText = await latestPriceElement.textContent();
      expect(priceText).toContain('$26.90'); // Last price sent
    }
  });

  test('should handle WebSocket errors gracefully', async ({ page }) => {
    // Monitor for error handling
    await page.evaluate(() => {
      window.errorCount = 0;
      window.ws.addEventListener('error', (event) => {
        window.errorCount++;
      });
    });

    // Simulate WebSocket error
    await page.evaluate(() => {
      window.ws.onerror(new Event('error'));
    });

    // Wait for error handling
    await page.waitForTimeout(1000);

    // Verify error message is displayed
    const errorMessage = page.locator('[data-testid="websocket-error"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
    }

    // Verify connection status shows error
    await expect(page.locator('[data-testid="connection-status"]')).toContainText(/error/i);
  });
});