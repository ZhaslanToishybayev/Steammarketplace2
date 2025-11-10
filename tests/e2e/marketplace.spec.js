/**
 * E2E tests for Marketplace functionality
 * End-to-end тесты для маркетплейса
 */

const { test, expect } = require('@playwright/test');

test.describe('Marketplace E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the marketplace
    await page.goto('/marketplace');
  });

  test('should display marketplace listings', async ({ page }) => {
    // Mock listings API
    await page.route('**/api/marketplace/listings', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: [
            {
              _id: '1',
              item: {
                name: 'AK-47 | Redline',
                marketName: 'AK-47 | Redline (Field-Tested)',
                iconUrl: 'https://example.com/icon1.jpg'
              },
              price: 15.99,
              status: 'active'
            },
            {
              _id: '2',
              item: {
                name: 'AWP | Dragon Lore',
                marketName: 'AWP | Dragon Lore (Factory New)',
                iconUrl: 'https://example.com/icon2.jpg'
              },
              price: 999.99,
              status: 'active'
            }
          ],
          total: 2,
          currentPage: 1,
          totalPages: 1
        })
      });
    });

    // Reload page to trigger API call
    await page.reload();

    // Check listings are displayed
    await expect(page.locator('text=AK-47 | Redline')).toBeVisible();
    await expect(page.locator('text=AWP | Dragon Lore')).toBeVisible();
    await expect(page.locator('text=$15.99')).toBeVisible();
    await expect(page.locator('text=$999.99')).toBeVisible();
  });

  test('should search for items', async ({ page }) => {
    // Mock search results
    await page.route('**/api/marketplace/listings**', async route => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: search === 'AK-47' ? [
            {
              _id: '1',
              item: {
                name: 'AK-47 | Redline',
                marketName: 'AK-47 | Redline (Field-Tested)'
              },
              price: 15.99,
              status: 'active'
            }
          ] : [],
          total: search === 'AK-47' ? 1 : 0,
          currentPage: 1,
          totalPages: 1
        })
      });
    });

    // Enter search term
    await page.fill('input[placeholder*="Search"]', 'AK-47');
    await page.press('input[placeholder*="Search"]', 'Enter');

    // Wait for search results
    await expect(page.locator('text=AK-47 | Redline')).toBeVisible();
  });

  test('should filter by price range', async ({ page }) => {
    // Mock filtered results
    await page.route('**/api/marketplace/listings**', async route => {
      const url = new URL(route.request().url());
      const minPrice = url.searchParams.get('minPrice');
      const maxPrice = url.searchParams.get('maxPrice');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: [
            {
              _id: '1',
              item: { name: 'Test Item', marketName: 'Test Item' },
              price: 50,
              status: 'active'
            }
          ],
          total: 1,
          currentPage: 1,
          totalPages: 1
        })
      });
    });

    // Set price range
    await page.fill('input[name="minPrice"]', '20');
    await page.fill('input[name="maxPrice"]', '100');
    await page.click('button:has-text("Apply Filters")');

    // Wait for filtered results
    await expect(page.locator('text=Test Item')).toBeVisible();
  });

  test('should sort listings by price', async ({ page }) => {
    // Mock sorted results
    await page.route('**/api/marketplace/listings**', async route => {
      const url = new URL(route.request().url());
      const sortBy = url.searchParams.get('sortBy');
      const sortOrder = url.searchParams.get('sortOrder');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: sortOrder === 'asc' ? [
            { _id: '1', item: { name: 'Cheap Item' }, price: 10 },
            { _id: '2', item: { name: 'Expensive Item' }, price: 100 }
          ] : [
            { _id: '2', item: { name: 'Expensive Item' }, price: 100 },
            { _id: '1', item: { name: 'Cheap Item' }, price: 10 }
          ],
          total: 2,
          currentPage: 1,
          totalPages: 1
        })
      });
    });

    // Change sort order
    await page.selectOption('select[name="sortOrder"]', 'asc');
    await page.waitForTimeout(500); // Wait for API call

    // Check sort order in UI
    const items = await page.locator('.listing-item').all();
    expect(items.length).toBeGreaterThan(0);
  });

  test('should display listing details', async ({ page }) => {
    // Mock single listing API
    await page.route('**/api/marketplace/listings/1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          _id: '1',
          item: {
            name: 'AK-47 | Redline',
            marketName: 'AK-47 | Redline (Field-Tested)',
            iconUrl: 'https://example.com/icon.jpg',
            exterior: 'Field-Tested',
            rarity: 'Classified',
            weapon: 'AK-47',
            skin: 'Redline'
          },
          price: 15.99,
          status: 'active',
          views: 5,
          seller: {
            username: 'SellerUser',
            reputation: 95
          }
        })
      });
    });

    // Click on listing
    await page.click('[data-testid="listing-1"]');

    // Check details
    await expect(page.locator('text=AK-47 | Redline')).toBeVisible();
    await expect(page.locator('text=$15.99')).toBeVisible();
    await expect(page.locator('text=SellerUser')).toBeVisible();
    await expect(page.locator('text=Views: 5')).toBeVisible();
  });

  test('should create new listing', async ({ page }) => {
    // Set auth token
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock_jwt_token');
    });

    // Mock create listing API
    let createRequest = null;
    await page.route('**/api/marketplace/listings', async route => {
      if (route.request().method() === 'POST') {
        createRequest = await route.request().postData();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'new_listing_1',
              item: { name: 'New Item' },
              price: 25.99
            }
          })
        });
      }
    });

    // Navigate to create listing page
    await page.goto('/marketplace/create');

    // Fill form
    await page.fill('input[name="assetId"]', '1234567890');
    await page.fill('input[name="name"]', 'New Item');
    await page.fill('input[name="price"]', '25.99');
    await page.click('button:has-text("Create Listing")');

    // Verify request was made
    expect(createRequest).not.toBeNull();
    const requestData = JSON.parse(createRequest);
    expect(requestData.name).toBe('New Item');
    expect(requestData.price).toBe(25.99);
  });

  test('should display pagination', async ({ page }) => {
    // Mock paginated results
    await page.route('**/api/marketplace/listings**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: Array(20).fill(0).map((_, i) => ({
            _id: `${i}`,
            item: { name: `Item ${i}` },
            price: i
          })),
          total: 50,
          currentPage: 1,
          totalPages: 3
        })
      });
    });

    // Reload page
    await page.reload();

    // Check pagination elements
    await expect(page.locator('text=Page 1 of 3')).toBeVisible();
    await expect(page.locator('button:has-text("2")')).toBeVisible();
    await expect(page.locator('button:has-text("Next")')).toBeVisible();
  });

  test('should navigate to next page', async ({ page }) => {
    let pageNumber = 1;
    await page.route('**/api/marketplace/listings**', async route => {
      const url = new URL(route.request().url());
      const pageParam = parseInt(url.searchParams.get('page') || '1');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: Array(20).fill(0).map((_, i) => ({
            _id: `p${pageParam}-i${i}`,
            item: { name: `Page ${pageParam} Item ${i}` },
            price: i
          })),
          total: 60,
          currentPage: pageParam,
          totalPages: 3
        })
      });
    });

    // Reload page
    await page.reload();

    // Click next page
    await page.click('button:has-text("Next")');

    // Wait for page 2
    await expect(page.locator('text=Page 2 of 3')).toBeVisible();
    await expect(page.locator('text=Page 2 Item 0')).toBeVisible();
  });

  test('should show empty state when no listings found', async ({ page }) => {
    // Mock empty results
    await page.route('**/api/marketplace/listings**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: [],
          total: 0,
          currentPage: 1,
          totalPages: 0
        })
      });
    });

    // Reload page
    await page.reload();

    // Check empty state
    await expect(page.locator('text=No listings found')).toBeVisible();
    await expect(page.locator('text=Create first listing')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/marketplace/listings', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      });
    });

    // Reload page
    await page.reload();

    // Check error message
    await expect(page.locator('text=Failed to load listings')).toBeVisible();
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('should show loading state', async ({ page }) => {
    // Mock slow API response
    let shouldDelay = true;
    await page.route('**/api/marketplace/listings', async route => {
      if (shouldDelay) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: [],
          total: 0,
          currentPage: 1,
          totalPages: 0
        })
      });
      shouldDelay = false;
    });

    // Navigate to page
    await page.reload();

    // Check loading spinner
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Wait for loading to complete
    await expect(page.locator('text=No listings found')).toBeVisible({ timeout: 3000 });
  });
});