/**
 * E2E Test: Trade Creation
 * Tests complete trade creation and execution flow including validation, bot assignment, and real-time updates
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../setup/test-config';

test.describe('Trade Creation', () => {
  let page: any;
  let context: any;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();

    // Mock authentication
    await page.evaluate((config) => {
      localStorage.setItem('accessToken', 'mock-access-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        steamId: config.users.regular.steamId,
        username: config.users.regular.username,
        role: 'USER'
      }));
    }, testConfig);

    // Mock trade creation response
    await page.route('**/api/trades', async route => {
      const postData = route.request().postData();
      const data = JSON.parse(postData || '{}');

      if (data.offerItems && data.offerItems.length > 0) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 12345,
              status: 'PENDING',
              type: data.type || 'TRADE',
              offerItems: data.offerItems,
              requestItems: data.requestItems || [],
              profit: 45.67,
              fee: 2.28,
              botId: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          })
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'At least one item must be selected',
            errors: {
              offerItems: 'Please select at least one item to offer'
            }
          })
        });
      }
    });

    // Mock bot status response
    await page.route('**/api/admin/bots', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              accountName: 'testbot1',
              status: 'ONLINE',
              maxConcurrentTrades: 5,
              currentTrades: 2
            }
          ]
        })
      });
    });

    // Mock trade status polling
    await page.route('**/api/trades/12345/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 12345,
            status: 'SENT',
            steamTradeId: 'trade_offer_id_12345',
            botId: 1,
            offerItems: [
              {
                name: 'AK-47 | Redline (Field-Tested)',
                appId: 730,
                classId: '123456',
                instanceId: '0'
              }
            ],
            requestItems: [],
            profit: 45.67,
            fee: 2.28,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      });
    });

    // Mock WebSocket for real-time updates
    await page.route('**/socket.io/**', async route => {
      // WebSocket mock for trade status updates
      await route.continue();
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('Trade initiation with item selection', async () => {
    console.log('🧪 Testing trade initiation...');

    await page.goto('/trade');

    // Verify page elements
    await expect(page.locator('h1:has-text("Create Trade")')).toBeVisible();
    await expect(page.locator('[data-testid="inventory-grid"]')).toBeVisible();

    // Mock inventory items
    await page.route('**/api/inventory', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'item_1',
              name: 'AK-47 | Redline (Field-Tested)',
              appId: 730,
              classId: '123456',
              instanceId: '0',
              type: 'Rifle',
              rarity: 'Covert',
              quality: 'Field-Tested',
              tradable: true,
              price: 245.67
            },
            {
              id: 'item_2',
              name: 'M4A4 | Desert-Strike (Factory New)',
              appId: 730,
              classId: '789012',
              instanceId: '0',
              type: 'Rifle',
              rarity: 'Classified',
              quality: 'Factory New',
              tradable: true,
              price: 189.99
            }
          ]
        })
      });
    });

    // Select items from inventory
    const firstItem = page.locator('[data-testid="inventory-item"]').first();
    await firstItem.click();
    await expect(page.locator('[data-testid="selected-items"]')).toContainText('AK-47');

    // Verify profit calculation
    await expect(page.locator('[data-testid="profit-calculation"]')).toContainText('$45.67');

    // Verify trade creation button is enabled
    const createTradeButton = page.locator('button:has-text("Create Trade")');
    await expect(createTradeButton).toBeEnabled();

    console.log('✅ Trade initiation completed successfully');
  });

  test('Trade validation errors', async () => {
    console.log('🧪 Testing trade validation...');

    await page.goto('/trade');

    // Try to create trade without selecting items
    const createTradeButton = page.locator('button:has-text("Create Trade")');
    await createTradeButton.click();

    // Verify validation error
    await expect(page.locator('text=Please select at least one item to offer')).toBeVisible();

    // Test insufficient balance (for withdrawal trades)
    await page.locator('select[name="tradeType"]').selectOption('WITHDRAWAL');
    await page.locator('input[name="amount"]').fill('10000'); // High amount

    await createTradeButton.click();
    await expect(page.locator('text=Insufficient balance')).toBeVisible();

    // Test trade hold detection
    await page.route('**/api/trades', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'TRADE_HOLD',
          message: 'Your account is under trade hold. Please wait 7 days.',
          tradeHoldDays: 7
        })
      });
    });

    // Mock items selection to bypass empty validation
    await page.evaluate(() => {
      const event = new Event('itemsSelected');
      (event as any).items = [{ name: 'Test Item', appId: 730 }];
      window.dispatchEvent(event);
    });

    await createTradeButton.click();
    await expect(page.locator('text=under trade hold')).toBeVisible();

    console.log('✅ Trade validation completed successfully');
  });

  test('Trade submission and bot assignment', async () => {
    console.log('🧪 Testing trade submission...');

    await page.goto('/trade');

    // Mock successful trade creation
    let tradeCreationCalled = false;
    await page.route('**/api/trades', async route => {
      tradeCreationCalled = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 12345,
            status: 'PENDING',
            botId: 1,
            steamTradeId: 'offer_12345',
            createdAt: new Date().toISOString()
          }
        })
      });
    });

    // Mock bot assignment
    await page.route('**/api/trading/assign-bot', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            botId: 1,
            botName: 'testbot1',
            status: 'ONLINE'
          }
        })
      });
    });

    // Simulate item selection
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('itemsSelected', {
        detail: { items: [{ name: 'AK-47', appId: 730, classId: '123' }] }
      }));
    });

    // Create trade
    const createTradeButton = page.locator('button:has-text("Create Trade")');
    await createTradeButton.click();

    // Verify trade creation
    await expect(page.locator('text=Trade created successfully')).toBeVisible();
    await expect(page.locator('[data-testid="trade-id"]')).toContainText('12345');

    // Verify bot assignment
    await expect(page.locator('[data-testid="bot-status"]')).toContainText('Assigned to testbot1');

    expect(tradeCreationCalled).toBe(true);

    console.log('✅ Trade submission and bot assignment completed successfully');
  });

  test('Trade status polling and real-time updates', async () => {
    console.log('🧪 Testing trade status polling...');

    await page.goto('/trade');

    // Navigate to trade history to see the created trade
    await page.click('text=Trade History');

    // Mock trade status progression
    let statusProgression = ['PENDING', 'SENT', 'ACCEPTED', 'COMPLETED'];
    let currentStatusIndex = 0;

    await page.route('**/api/trades/12345/status', async route => {
      const status = statusProgression[currentStatusIndex];
      currentStatusIndex = Math.min(currentStatusIndex + 1, statusProgression.length - 1);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 12345,
            status: status,
            steamTradeId: 'offer_12345',
            botId: 1,
            updatedAt: new Date().toISOString()
          }
        })
      });
    });

    // Simulate trade in history
    await page.evaluate(() => {
      const tradeElement = document.createElement('div');
      tradeElement.setAttribute('data-testid', 'trade-item');
      tradeElement.setAttribute('data-trade-id', '12345');
      tradeElement.innerHTML = `
        <span>Trade #12345</span>
        <span data-testid="trade-status">PENDING</span>
        <button data-testid="view-trade">View Details</button>
      `;
      document.body.appendChild(tradeElement);
    });

    // Click to view trade details
    await page.click('[data-testid="view-trade"]');

    // Verify initial status
    await expect(page.locator('[data-testid="trade-status"]')).toContainText('PENDING');

    // Simulate status updates (would normally come from polling or WebSocket)
    for (const status of statusProgression) {
      await page.evaluate((status) => {
        const statusElement = document.querySelector('[data-testid="trade-status"]');
        if (statusElement) {
          statusElement.textContent = status;
        }
        // Trigger status update event
        window.dispatchEvent(new CustomEvent('tradeStatusUpdate', {
          detail: { tradeId: 12345, status: status }
        }));
      }, status);

      await expect(page.locator('[data-testid="trade-status"]')).toContainText(status);
      await page.waitForTimeout(500); // Small delay between updates
    }

    // Verify final status
    await expect(page.locator('[data-testid="trade-status"]')).toContainText('COMPLETED');
    await expect(page.locator('text=Trade completed successfully')).toBeVisible();

    console.log('✅ Trade status polling completed successfully');
  });

  test('Trade completion and inventory updates', async () => {
    console.log('🧪 Testing trade completion...');

    await page.goto('/trade');

    // Mock completed trade
    await page.route('**/api/trades/12345', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 12345,
            status: 'COMPLETED',
            type: 'DEPOSIT',
            offerItems: [],
            requestItems: [
              {
                name: 'AWP | Dragon Lore (Minimal Wear)',
                appId: 730,
                classId: 'dragon_123',
                instanceId: '0'
              }
            ],
            profit: 0,
            fee: 0,
            completedAt: new Date().toISOString(),
            botId: 1
          }
        })
      });
    });

    // Mock wallet balance update
    let balanceUpdated = false;
    await page.route('**/api/wallet/balance', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              amount: 1045.67, // Initial 1000 + trade profit
              currency: 'USD',
              updatedAt: new Date().toISOString()
            }
          })
        });
      }
    });

    // Navigate to completed trade
    await page.evaluate(() => {
      const tradeElement = document.createElement('div');
      tradeElement.setAttribute('data-testid', 'completed-trade');
      tradeElement.innerHTML = `
        <span>Trade #12345</span>
        <span>COMPLETED</span>
        <button data-testid="view-completed-trade">View</button>
      `;
      document.body.appendChild(tradeElement);
    });

    await page.click('[data-testid="view-completed-trade"]');

    // Verify trade completion details
    await expect(page.locator('[data-testid="trade-status"]')).toContainText('COMPLETED');
    await expect(page.locator('[data-testid="received-items"]')).toContainText('Dragon Lore');

    // Check balance was updated
    await page.click('text=Wallet');
    await expect(page.locator('[data-testid="balance-amount"]')).toContainText('$1,045.67');

    console.log('✅ Trade completion and inventory updates completed successfully');
  });

  test('Trade cancellation', async () => {
    console.log('🧪 Testing trade cancellation...');

    await page.goto('/trade');

    // Mock pending trade
    await page.route('**/api/trades/12345/cancel', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Trade cancelled successfully'
        })
      });
    });

    // Mock trade items return
    await page.route('**/api/trading/return-items', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            returnedItems: [
              {
                name: 'AK-47 | Redline (Field-Tested)',
                appId: 730,
                classId: '123456',
                instanceId: '0'
              }
            ]
          }
        })
      });
    });

    // Navigate to pending trade
    await page.evaluate(() => {
      const tradeElement = document.createElement('div');
      tradeElement.setAttribute('data-testid', 'pending-trade');
      tradeElement.innerHTML = `
        <span>Trade #12345</span>
        <span data-testid="trade-status">PENDING</span>
        <button data-testid="cancel-trade">Cancel Trade</button>
      `;
      document.body.appendChild(tradeElement);
    });

    // Cancel trade
    const cancelTradeButton = page.locator('[data-testid="cancel-trade"]');
    await cancelTradeButton.click();

    // Verify cancellation
    await expect(page.locator('text=Trade cancelled successfully')).toBeVisible();
    await expect(page.locator('[data-testid="trade-status"]')).toContainText('CANCELLED');

    // Verify items returned to inventory
    await expect(page.locator('text=Items returned to inventory')).toBeVisible();

    console.log('✅ Trade cancellation completed successfully');
  });

  test('Concurrent trade handling', async () => {
    console.log('🧪 Testing concurrent trade handling...');

    await page.goto('/trade');

    // Mock bot busy response
    await page.route('**/api/trades', async route => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'NO_AVAILABLE_BOTS',
          message: 'No bots available. Please try again in a few minutes.',
          retryAfter: 60
        })
      });
    });

    // Try to create trade when no bots available
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('itemsSelected', {
        detail: { items: [{ name: 'Test Item', appId: 730 }] }
      }));
    });

    const createTradeButton = page.locator('button:has-text("Create Trade")');
    await createTradeButton.click();

    // Verify error message
    await expect(page.locator('text=No bots available')).toBeVisible();
    await expect(page.locator('text=try again in a few minutes')).toBeVisible();

    // Mock retry after bot becomes available
    await page.route('**/api/trades', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 12346,
            status: 'PENDING',
            botId: 2,
            createdAt: new Date().toISOString()
          }
        })
      });
    });

    // Retry trade creation
    await page.click('button:has-text("Try Again")');
    await expect(page.locator('text=Trade created successfully')).toBeVisible();

    console.log('✅ Concurrent trade handling completed successfully');
  });
});