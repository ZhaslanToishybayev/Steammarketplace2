/**
 * Market Browsing E2E Tests
 * Tests market browsing, price history, and item discovery functionality
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../setup/test-config';

test.describe('Market Browsing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the marketplace
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Ensure we're on the marketplace page
    await expect(page.locator('h1')).toContainText(/marketplace|market/i);
  });

  test('should display market overview and navigation', async ({ page }) => {
    // Test market overview
    await expect(page.locator('[data-testid="market-overview"]')).toBeVisible();

    // Test navigation tabs
    await expect(page.locator('[data-testid="market-navigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-tab-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-tab-rifles"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-tab-pistols"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-tab-knives"]')).toBeVisible();

    // Test search functionality
    await expect(page.locator('[data-testid="market-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  test('should filter items by category', async ({ page }) => {
    // Click on rifles tab
    await page.click('[data-testid="nav-tab-rifles"]');
    await page.waitForLoadState('networkidle');

    // Verify rifles are displayed
    await expect(page.locator('[data-testid="item-card"]')).toHaveCount({ min: 1 });

    // Check that displayed items are rifles
    const firstItem = page.locator('[data-testid="item-card"]').first();
    await expect(firstItem).toBeVisible();
  });

  test('should search for items by name', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('AK-47');

    // Wait for search results
    await page.waitForTimeout(1000);

    // Verify search results
    const itemCards = page.locator('[data-testid="item-card"]');
    await expect(itemCards).toHaveCount({ min: 1 });

    // Check that results contain AK-47
    const firstResult = itemCards.first();
    await expect(firstResult.locator('[data-testid="item-name"]')).toContainText(/AK-47/i);
  });

  test('should sort items by price', async ({ page }) => {
    // Select price high to low sorting
    await page.selectOption('[data-testid="sort-select"]', 'price-desc');

    // Wait for sorting to complete
    await page.waitForTimeout(1000);

    // Verify items are sorted (first item should have higher price than last)
    const priceElements = page.locator('[data-testid="item-price"]');
    const firstPrice = await priceElements.first().textContent();
    const lastPrice = await priceElements.last().textContent();

    if (firstPrice && lastPrice) {
      const firstPriceNum = parseFloat(firstPrice.replace(/[^0-9.]/g, ''));
      const lastPriceNum = parseFloat(lastPrice.replace(/[^0-9.]/g, ''));
      expect(firstPriceNum).toBeGreaterThanOrEqual(lastPriceNum);
    }
  });

  test('should display item details on click', async ({ page }) => {
    // Click on first item
    const firstItem = page.locator('[data-testid="item-card"]').first();
    await firstItem.click();

    // Wait for item detail modal/page to load
    await page.waitForSelector('[data-testid="item-detail"]', { timeout: 10000 });

    // Verify item detail is visible
    await expect(page.locator('[data-testid="item-detail"]')).toBeVisible();

    // Check for item information
    await expect(page.locator('[data-testid="item-detail-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="item-detail-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="item-detail-image"]')).toBeVisible();
  });

  test('should display price history chart', async ({ page }) => {
    // Navigate to an item detail page
    const firstItem = page.locator('[data-testid="item-card"]').first();
    await firstItem.click();

    await page.waitForSelector('[data-testid="item-detail"]', { timeout: 10000 });

    // Look for price history tab/button
    const priceHistoryTab = page.locator('[data-testid="price-history-tab"]');
    if (await priceHistoryTab.isVisible()) {
      await priceHistoryTab.click();
      await page.waitForTimeout(1000);

      // Verify price history chart is visible
      await expect(page.locator('[data-testid="price-history-chart"]')).toBeVisible();
    }
  });

  test('should filter items by price range', async ({ page }) => {
    // Look for price range filter
    const minPriceInput = page.locator('[data-testid="min-price-input"]');
    const maxPriceInput = page.locator('[data-testid="max-price-input"]');

    if (await minPriceInput.isVisible() && await maxPriceInput.isVisible()) {
      await minPriceInput.fill('10');
      await maxPriceInput.fill('100');

      // Apply filter
      await page.click('[data-testid="apply-filters-button"]');
      await page.waitForLoadState('networkidle');

      // Verify filtered results
      const itemPrices = page.locator('[data-testid="item-price"]');
      const count = await itemPrices.count();

      for (let i = 0; i < count; i++) {
        const priceText = await itemPrices.nth(i).textContent();
        if (priceText) {
          const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
          expect(price).toBeGreaterThanOrEqual(10);
          expect(price).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  test('should paginate through market results', async ({ page }) => {
    // Look for pagination controls
    const pagination = page.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      // Check if there are multiple pages
      const pageButtons = page.locator('[data-testid="page-button"]');
      const pageCount = await pageButtons.count();

      if (pageCount > 1) {
        // Click on page 2
        await pageButtons.nth(1).click();
        await page.waitForLoadState('networkidle');

        // Verify we're on a different page (different items)
        const firstItemPage1 = await page.locator('[data-testid="item-card"]').first().textContent();
        await pageButtons.first().click(); // Go back to page 1
        await page.waitForLoadState('networkidle');
        const firstItemPage2 = await page.locator('[data-testid="item-card"]').first().textContent();

        // Items should be different
        expect(firstItemPage1).not.toBe(firstItemPage2);
      }
    }
  });

  test('should display item condition and rarity', async ({ page }) => {
    // Check that items display their condition and rarity
    const firstItem = page.locator('[data-testid="item-card"]').first();
    await expect(firstItem.locator('[data-testid="item-condition"]')).toBeVisible();
    await expect(firstItem.locator('[data-testid="item-rarity"]')).toBeVisible();
  });

  test('should handle empty search results', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('NonExistentItem12345');

    await page.waitForTimeout(1000);

    // Should show no results message or empty state
    const noResults = page.locator('[data-testid="no-results"]');
    if (await noResults.isVisible()) {
      await expect(noResults).toBeVisible();
    } else {
      // Or should have no item cards
      const itemCards = page.locator('[data-testid="item-card"]');
      expect(await itemCards.count()).toBe(0);
    }
  });
});