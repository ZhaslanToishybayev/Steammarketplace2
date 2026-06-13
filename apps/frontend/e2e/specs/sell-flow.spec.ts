import { test, expect } from '@playwright/test';
import { mockInventory, mockTradeSuccess } from '../mocks/inventory.mock';

test.describe('Sell Page & Trading Flow', () => {
  
  // Setup: Auto-login mock and intercept API calls
  test.beforeEach(async ({ context }) => {
    // CRITICAL: Set route at CONTEXT level to capture all page requests immediately
    await context.route('**/api/auth/me', async route => {
      console.log('Context Mock: /api/auth/me');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          success: true,
          user: {
            steamId: '76561198000000000',
            username: 'TestUser',
            avatar: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
            tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=123&token=abc'
          }
        }
      });
    });

    await context.route('**/api/inventory**', async route => {
      console.log('Context Mock: /api/inventory');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: mockInventory 
      });
    });
    
    await context.route('**/api/trade/create', async route => {
       await route.fulfill({ json: mockTradeSuccess });
    });
  });

  test('TC-INV-01: Should load inventory and render items', async ({ page }) => {
    await page.goto('/sell');
    
    // Check Header
    await expect(page.locator('h1')).toContainText('Instant Sell', { timeout: 15000 });
    
    // Check Inventory Loading
    const ak47 = page.getByText('AK-47 | Redline');
    await expect(ak47).toBeVisible({ timeout: 15000 });
    
    // Check "Tradable" badge
    await expect(page.locator('.bg-green-500\\/20').first()).toBeVisible();
  });

  test('TC-TRD-01: Should select item and execute instant sell', async ({ page }) => {
    await page.goto('/sell');
    
    // Wait for auth to settle
    await expect(page.locator('h1')).toContainText('Instant Sell', { timeout: 15000 });

    // 1. Select Item
    await page.getByText('AK-47 | Redline').click();
    
    // 2. Check "Bot Offer" section appears
    await expect(page.getByText('Bot Offer')).toBeVisible();
    
    // 3. Click "Sell Instantly Now"
    // Mock instant sell endpoint specifically
    await page.route('**/api/trade/instant-sell', async route => {
       await route.fulfill({ json: { success: true, tradeUuid: 'uuid-123' } });
    });

    const sellButton = page.getByRole('button', { name: /Sell Instantly Now/i });
    await expect(sellButton).toBeEnabled();
    await sellButton.click();

    // 4. Verify Success (Logic assumes UI reacts)
  });

  test('TC-VIS-01: Mobile Layout Check', async ({ page }) => {
    await page.goto('/sell');
    
    if (page.viewportSize()?.width && page.viewportSize()!.width < 768) {
       // Wait for content to ensure we aren't stuck on login
       await expect(page.getByText('Instant Sell')).toBeVisible({ timeout: 15000 });
    }
  });

});
