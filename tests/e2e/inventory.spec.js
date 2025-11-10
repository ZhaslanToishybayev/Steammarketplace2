/**
 * E2E tests for Steam Inventory functionality
 * End-to-end тесты для инвентаря Steam
 */

const { test, expect } = require('@playwright/test');

test.describe('Steam Inventory E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set auth token
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock_jwt_token');
    });

    // Navigate to inventory page
    await page.goto('/inventory');
  });

  test('should display CS2 inventory', async ({ page }) => {
    // Mock inventory API
    await page.route('**/api/steam/inventory**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                assetid: '1234567890',
                classid: '730_1',
                name: 'AK-47 | Redline',
                market_name: 'AK-47 | Redline (Field-Tested)',
                icon_url: 'https://example.com/icon1.jpg',
                tradable: 1,
                marketable: 1
              },
              {
                assetid: '1234567891',
                classid: '730_2',
                name: 'AWP | Dragon Lore',
                market_name: 'AWP | Dragon Lore (Factory New)',
                icon_url: 'https://example.com/icon2.jpg',
                tradable: 1,
                marketable: 1
              }
            ]
          }
        })
      });
    });

    // Reload page
    await page.reload();

    // Check inventory items
    await expect(page.locator('text=AK-47 | Redline')).toBeVisible();
    await expect(page.locator('text=AWP | Dragon Lore')).toBeVisible();
    await expect(page.locator('text=Tradable')).toBeVisible();
  });

  test('should switch between CS2 and Dota 2', async ({ page }) => {
    // Mock CS2 inventory
    await page.route('**/api/steam/inventory**', async route => {
      const url = new URL(route.request().url());
      const game = url.searchParams.get('game');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: game === 'dota2' ? [
              {
                assetid: '9876543210',
                name: 'Dragonclaw Hook',
                market_name: 'Dragonclaw Hook',
                tradable: 1
              }
            ] : [
              {
                assetid: '1234567890',
                name: 'AK-47 | Redline',
                market_name: 'AK-47 | Redline',
                tradable: 1
              }
            ]
          }
        })
      });
    });

    // Check CS2 is selected by default
    await expect(page.locator('button:has-text("CS2")')).toHaveClass(/active/);

    // Click Dota 2
    await page.click('button:has-text("Dota 2")');

    // Wait for inventory to update
    await expect(page.locator('text=Dragonclaw Hook')).toBeVisible();
  });

  test('should filter tradable items', async ({ page }) => {
    // Mock mixed inventory
    await page.route('**/api/steam/inventory**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                assetid: '1',
                name: 'Tradable Item',
                tradable: 1
              },
              {
                assetid: '2',
                name: 'Non-Tradable Item',
                tradable: 0
              }
            ]
          }
        })
      });
    });

    // Reload page
    await page.reload();

    // Check all items are shown
    await expect(page.locator('text=Tradable Item')).toBeVisible();
    await expect(page.locator('text=Non-Tradable Item')).toBeVisible();

    // Filter for tradable only
    await page.click('input[name="tradableOnly"]');
    await page.waitForTimeout(500);

    // Only tradable should be visible
    await expect(page.locator('text=Tradable Item')).toBeVisible();
    await expect(page.locator('text=Non-Tradable Item')).not.toBeVisible();
  });

  test('should display item details on click', async ({ page }) => {
    // Mock inventory and item details
    await page.route('**/api/steam/inventory**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                assetid: '1234567890',
                classid: '730_1',
                name: 'AK-47 | Redline',
                market_name: 'AK-47 | Redline (Field-Tested)',
                icon_url: 'https://example.com/icon.jpg',
                tradable: 1,
                marketable: 1,
                type: 'Rifle',
                exterior: 'Field-Tested'
              }
            ]
          }
        })
      });
    });

    // Reload page
    await page.reload();

    // Click on item
    await page.click('[data-testid="item-1234567890"]');

    // Check details modal
    await expect(page.locator('text=AK-47 | Redline')).toBeVisible();
    await expect(page.locator('text=Field-Tested')).toBeVisible();
    await expect(page.locator('text=Rifle')).toBeVisible();
  });

  test('should show item action buttons', async ({ page }) => {
    // Mock inventory
    await page.route('**/api/steam/inventory**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                assetid: '1234567890',
                name: 'AK-47 | Redline',
                market_name: 'AK-47 | Redline',
                tradable: 1,
                marketable: 1
              }
            ]
          }
        })
      });
    });

    // Reload page
    await page.reload();

    // Click on item to open modal
    await page.click('[data-testid="item-1234567890"]');

    // Check action buttons
    await expect(page.locator('button:has-text("List for Sale")')).toBeVisible();
    await expect(page.locator('button:has-text("Inspect")')).toBeVisible();
  });

  test('should list item for sale', async ({ page }) => {
    // Mock inventory and create listing API
    await page.route('**/api/steam/inventory**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                assetid: '1234567890',
                name: 'AK-47 | Redline',
                tradable: 1,
                marketable: 1
              }
            ]
          }
        })
      });
    });

    let createListingRequest = null;
    await page.route('**/api/marketplace/listings', async route => {
      if (route.request().method() === 'POST') {
        createListingRequest = await route.request().postData();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'new_listing_1' }
          })
        });
      }
    });

    // Reload page
    await page.reload();

    // Open item modal
    await page.click('[data-testid="item-1234567890"]');

    // Click "List for Sale"
    await page.click('button:has-text("List for Sale")');

    // Fill listing form
    await page.fill('input[name="price"]', '15.99');
    await page.click('button:has-text("Create Listing")');

    // Verify request
    expect(createListingRequest).not.toBeNull();
    const requestData = JSON.parse(createListingRequest);
    expect(requestData.assetId).toBe('1234567890');
    expect(requestData.price).toBe(15.99);
  });

  test('should show empty state when inventory is empty', async ({ page }) => {
    // Mock empty inventory
    await page.route('**/api/steam/inventory**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: []
          }
        })
      });
    });

    // Reload page
    await page.reload();

    // Check empty state
    await expect(page.locator('text=Your inventory is empty')).toBeVisible();
    await expect(page.locator('text=Please check your Steam inventory')).toBeVisible();
  });

  test('should handle API errors', async ({ page }) => {
    // Mock API error
    await page.route('**/api/steam/inventory**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to fetch inventory'
        })
      });
    });

    // Reload page
    await page.reload();

    // Check error message
    await expect(page.locator('text=Failed to load inventory')).toBeVisible();
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('should refresh inventory', async ({ page }) => {
    let refreshCount = 0;
    await page.route('**/api/steam/inventory**', async route => {
      refreshCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                assetid: '1',
                name: `Item ${refreshCount}`,
                tradable: 1
              }
            ]
          }
        })
      });
    });

    // Initial load
    await page.reload();
    await expect(page.locator('text=Item 1')).toBeVisible();

    // Click refresh
    await page.click('button:has-text("Refresh")');

    // Wait for update
    await expect(page.locator('text=Item 2')).toBeVisible();
  });

  test('should show loading state', async ({ page }) => {
    // Mock slow API response
    let shouldDelay = true;
    await page.route('**/api/steam/inventory**', async route => {
      if (shouldDelay) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [] }
        })
      });
      shouldDelay = false;
    });

    // Navigate to page
    await page.reload();

    // Check loading
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  });

  test('should filter by item type', async ({ page }) => {
    // Mock inventory with different types
    await page.route('**/api/steam/inventory**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                assetid: '1',
                name: 'AK-47',
                type: 'Rifle'
              },
              {
                assetid: '2',
                name: 'Glock',
                type: 'Pistol'
              }
            ]
          }
        })
      });
    });

    // Reload page
    await page.reload();

    // Filter by type
    await page.selectOption('select[name="itemType"]', 'Rifle');
    await page.waitForTimeout(500);

    // Check filtered results
    await expect(page.locator('text=AK-47')).toBeVisible();
    await expect(page.locator('text=Glock')).not.toBeVisible();
  });
});