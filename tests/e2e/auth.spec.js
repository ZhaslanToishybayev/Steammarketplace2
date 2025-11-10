/**
 * E2E tests for Authentication flow
 * End-to-end тесты для потока аутентификации
 */

const { test, expect } = require('@playwright/test');

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    // Check that the page loaded
    await expect(page).toHaveTitle(/Steam Marketplace/i);

    // Check for login elements
    await expect(page.locator('text=Login')).toBeVisible();
  });

  test('should redirect to Steam OAuth', async ({ page }) => {
    // Mock the Steam OAuth service
    await page.route('**/api/auth/steam', async route => {
      await route.fulfill({
        status: 302,
        headers: {
          location: 'https://steamcommunity.com/openid/login'
        }
      });
    });

    // Click login button
    await page.click('button:has-text("Login with Steam")');

    // Should redirect to Steam
    await expect(page).toHaveURL(/steamcommunity\.com\/openid\/login/);
  });

  test('should handle successful login', async ({ page }) => {
    // Mock successful Steam callback
    await page.route('**/api/auth/steam/callback**', async route => {
      await route.fulfill({
        status: 302,
        headers: {
          location: '/dashboard?token=mock_jwt_token'
        }
      });
    });

    // Simulate OAuth callback
    await page.goto('/api/auth/steam/callback?state=test');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should display user profile after login', async ({ page }) => {
    // Mock authenticated API response
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            steamId: '76561198782060203',
            steamName: 'TestUser',
            displayName: 'Test User',
            avatar: 'https://example.com/avatar.jpg',
            wallet: { balance: 500, pendingBalance: 0 }
          }
        })
      });
    });

    // Set auth token
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock_jwt_token');
    });

    // Navigate to profile
    await page.goto('/profile');

    // Check profile elements
    await expect(page.locator('text=Test User')).toBeVisible();
    await expect(page.locator('text=Balance: $500')).toBeVisible();
  });

  test('should handle logout', async ({ page }) => {
    // Set auth token
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock_jwt_token');
    });

    // Navigate to profile
    await page.goto('/profile');

    // Mock logout API
    await page.route('**/api/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: 'Logged out successfully' }
        })
      });
    });

    // Click logout
    await page.click('button:has-text("Logout")');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Mock invalid login response
    await page.route('**/api/auth/steam/callback**', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Authentication failed'
        })
      });
    });

    // Try to authenticate
    await page.goto('/api/auth/steam/callback?error=access_denied');

    // Should show error message
    await expect(page.locator('text=Authentication failed')).toBeVisible();
  });

  test('should redirect to login when accessing protected page without auth', async ({ page }) => {
    // Try to access protected page
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/');
  });

  test('should maintain session after page reload', async ({ page }) => {
    // Set auth token
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock_jwt_token');
    });

    // Mock profile API
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            steamId: '76561198782060203',
            steamName: 'TestUser'
          }
        })
      });
    });

    // Navigate to profile
    await page.goto('/profile');

    // Reload page
    await page.reload();

    // Should still be on profile page
    await expect(page).toHaveURL('/profile');
  });

  test('should display wallet balance', async ({ page }) => {
    // Set auth token
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock_jwt_token');
    });

    // Mock profile API with wallet data
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            steamId: '76561198782060203',
            wallet: {
              balance: 1234.56,
              pendingBalance: 100.00
            }
          }
        })
      });
    });

    // Navigate to profile
    await page.goto('/profile');

    // Check wallet display
    await expect(page.locator('text=$1,234.56')).toBeVisible();
    await expect(page.locator('text=Pending: $100.00')).toBeVisible();
  });

  test('should show loading state during authentication', async ({ page }) => {
    // Mock slow auth response
    let responseDelay = 2000;
    await page.route('**/api/auth/steam/callback**', async route => {
      await new Promise(resolve => setTimeout(resolve, responseDelay));
      await route.fulfill({
        status: 302,
        headers: { location: '/dashboard' }
      });
    });

    // Start login
    await page.goto('/api/auth/steam/callback?state=test');

    // Should show loading spinner
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Wait for redirect
    await expect(page).toHaveURL('/dashboard', { timeout: 5000 });
  });
});