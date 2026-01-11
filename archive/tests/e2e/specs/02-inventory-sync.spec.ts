/**
 * E2E Test: Inventory Sync
 * Tests inventory synchronization flow, filtering, search, and pagination
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../setup/test-config';

test.describe('Inventory Sync', () => {
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

    // Mock inventory sync responses
    await page.route('**/api/inventory/sync', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Inventory sync started',
          syncId: 'sync_' + Date.now()
        })
      });
    });

    await page.route('**/api/inventory/sync-status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'completed',
          progress: 100,
          itemsSynced: 25,
          duration: 5000,
          lastSync: new Date().toISOString()
        })
      });
    });

    await page.route('**/api/inventory', async route => {
      const items = [
        {
          id: 'item_1',
          name: 'AK-47 | Redline (Field-Tested)',
          appId: 730,
          classId: '123456',
          instanceId: '0',
          description: 'High-quality AK-47 with redline pattern',
          type: 'Rifle',
          rarity: 'Covert',
          quality: 'Field-Tested',
          iconUrl: 'https://steamcdn-a.akamaihd.net/apps/730/icons/weapon_ak47.abc123.png',
          tradable: true,
          marketable: true,
          float: 0.123456,
          wear: 'Field-Tested',
          stickers: [],
          price: 245.67
        },
        {
          id: 'item_2',
          name: 'M4A4 | Desert-Strike (Factory New)',
          appId: 730,
          classId: '789012',
          instanceId: '0',
          description: 'M4A4 with desert camouflage pattern',
          type: 'Rifle',
          rarity: 'Classified',
          quality: 'Factory New',
          iconUrl: 'https://steamcdn-a.akamaihd.net/apps/730/icons/weapon_m4a4.abc123.png',
          tradable: true,
          marketable: true,
          float: 0.001234,
          wear: 'Factory New',
          stickers: [],
          price: 189.99
        }
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: items,
          pagination: {
            total: 25,
            page: 1,
            limit: 20,
            totalPages: 2
          }
        })
      });
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('Manual inventory sync trigger', async () => {
    console.log('🧪 Testing manual inventory sync...');

    await page.goto('/inventory');

    // Verify page title and elements
    await expect(page.locator('h1:has-text("Inventory")')).toBeVisible();
    await expect(page.locator('button:has-text("Sync Inventory")')).toBeVisible();

    // Start sync
    const syncButton = page.locator('button:has-text("Sync Inventory")');
    await syncButton.click();

    // Verify loading state
    await expect(page.locator('text=Syncing inventory...')).toBeVisible();

    // Wait for sync completion
    await expect(page.locator('text=Inventory synced successfully')).toBeVisible({ timeout: 10000 });

    // Verify items are displayed
    await expect(page.locator('[data-testid="inventory-item"]')).toHaveCount(2);

    console.log('✅ Manual inventory sync completed successfully');
  });

  test('Multi-game inventory display', async () => {
    console.log('🧪 Testing multi-game inventory...');

    // Mock different game inventories
    await page.route('**/api/inventory?appId=570', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'dota_item_1',
              name: 'Immortal Cap',
              appId: 570,
              classId: 'dota_123',
              instanceId: '0',
              type: 'Cosmetic',
              rarity: 'Immortal',
              quality: 'Factory New',
              tradable: true,
              marketable: true,
              price: 150.00
            }
          ]
        })
      });
    });

    await page.goto('/inventory');

    // Verify game filter dropdown
    const gameFilter = page.locator('select[name="gameFilter"]');
    await expect(gameFilter).toBeVisible();

    // Test CS:GO items (default)
    await expect(page.locator('[data-testid="inventory-item"]').first()).toContainText('AK-47');

    // Test Dota 2 items
    await gameFilter.selectOption('570');
    await expect(page.locator('[data-testid="inventory-item"]').first()).toContainText('Immortal Cap');

    console.log('✅ Multi-game inventory display completed successfully');
  });

  test('Inventory filtering and search', async () => {
    console.log('🧪 Testing inventory filtering and search...');

    await page.goto('/inventory');

    // Test rarity filter
    const rarityFilter = page.locator('select[name="rarityFilter"]');
    await rarityFilter.selectOption('Covert');
    await expect(page.locator('[data-testid="inventory-item"]')).toContainText('Redline');

    // Test tradability filter
    const tradableFilter = page.locator('select[name="tradableFilter"]');
    await tradableFilter.selectOption('true');
    await expect(page.locator('[data-testid="inventory-item"]')).toBeVisible();

    // Test price range filter
    const minPriceInput = page.locator('input[name="minPrice"]');
    const maxPriceInput = page.locator('input[name="maxPrice"]');

    await minPriceInput.fill('200');
    await maxPriceInput.fill('300');
    await page.locator('button:has-text("Apply Filters")').click();

    // Verify filtered results
    const items = page.locator('[data-testid="inventory-item"]');
    for (let i = 0; i < await items.count(); i++) {
      const itemText = await items.nth(i).textContent();
      expect(itemText).toContain('AK-47');
    }

    // Test search functionality
    const searchInput = page.locator('input[name="search"]');
    await searchInput.fill('AK-47');
    await expect(page.locator('[data-testid="inventory-item"]').first()).toContainText('AK-47');

    console.log('✅ Inventory filtering and search completed successfully');
  });

  test('Inventory pagination', async () => {
    console.log('🧪 Testing inventory pagination...');

    // Mock paginated response
    await page.route('**/api/inventory?limit=2&offset=2', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'item_3',
              name: 'AWP | Dragon Lore (Minimal Wear)',
              appId: 730,
              classId: 'dragon_123',
              instanceId: '0',
              type: 'Rifle',
              rarity: 'Covert',
              quality: 'Minimal Wear',
              tradable: true,
              marketable: true,
              price: 1250.00
            }
          ],
          pagination: {
            total: 25,
            page: 2,
            limit: 2,
            totalPages: 13
          }
        })
      });
    });

    await page.goto('/inventory');

    // Verify pagination controls
    await expect(page.locator('[data-testid="pagination-controls"]')).toBeVisible();
    await expect(page.locator('[data-testid="page-info"]')).toContainText('1-2 of 25');

    // Navigate to next page
    const nextPageButton = page.locator('[data-testid="next-page"]');
    await nextPageButton.click();

    // Verify page 2 content
    await expect(page.locator('[data-testid="inventory-item"]').first()).toContainText('Dragon Lore');
    await expect(page.locator('[data-testid="page-info"]')).toContainText('3-4 of 25');

    console.log('✅ Inventory pagination completed successfully');
  });

  test('Cache validation for rapid syncs', async () => {
    console.log('🧪 Testing cache validation...');

    let syncCallCount = 0;
    await page.route('**/api/inventory/sync', async route => {
      syncCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: syncCallCount === 1 ? 'Sync started' : 'Sync cached',
          cached: syncCallCount > 1
        })
      });
    });

    await page.goto('/inventory');

    // First sync
    await page.locator('button:has-text("Sync Inventory")').click();
    await expect(page.locator('text=Inventory synced successfully')).toBeVisible();

    // Rapid second sync (should be cached)
    await page.locator('button:has-text("Sync Inventory")').click();
    await expect(page.locator('text=Sync from cache')).toBeVisible();

    // Verify only one actual sync call was made
    expect(syncCallCount).toBe(1);

    console.log('✅ Cache validation completed successfully');
  });

  test('Inventory item details', async () => {
    console.log('🧪 Testing inventory item details...');

    await page.goto('/inventory');

    // Click on item to view details
    const firstItem = page.locator('[data-testid="inventory-item"]').first();
    await firstItem.click();

    // Verify item detail modal opens
    await expect(page.locator('[data-testid="item-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="item-name"]')).toContainText('AK-47 | Redline');

    // Verify item details
    await expect(page.locator('[data-testid="item-float"]')).toContainText('0.123');
    await expect(page.locator('[data-testid="item-wear"]')).toContainText('Field-Tested');
    await expect(page.locator('[data-testid="item-price"]')).toContainText('$245.67');

    // Close modal
    await page.locator('[data-testid="close-modal"]').click();
    await expect(page.locator('[data-testid="item-detail-modal"]')).not.toBeVisible();

    console.log('✅ Inventory item details completed successfully');
  });

  test('Inventory error handling', async () => {
    console.log('🧪 Testing inventory error handling...');

    // Mock sync error
    await page.route('**/api/inventory/sync', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Steam API error',
          message: 'Unable to sync inventory from Steam'
        })
      });
    });

    await page.goto('/inventory');

    // Try to sync
    await page.locator('button:has-text("Sync Inventory")').click();

    // Verify error message
    await expect(page.locator('text=Unable to sync inventory')).toBeVisible();
    await expect(page.locator('text=Please try again later')).toBeVisible();

    console.log('✅ Inventory error handling completed successfully');
  });
});