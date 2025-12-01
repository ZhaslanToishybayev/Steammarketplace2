/**
 * E2E Test: Authentication Flow
 * Tests complete authentication flow including Steam OAuth login, trade URL setup, and session management
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../setup/test-config';

test.describe('Authentication Flow', () => {
  let page: any;
  let context: any;

  test.beforeEach(async ({ browser }) => {
    // Create a new browser context for each test
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();

    // Mock Steam OAuth responses
    await page.route('**/steamcommunity.com/openid/login*', async route => {
      await route.fulfill({
        status: 302,
        headers: {
          'Location': `${testConfig.apiUrl}/auth/steam/return?openid.claimed_id=http://steamcommunity.com/profiles/${testConfig.users.regular.steamId}&openid.identity=http://steamcommunity.com/profiles/${testConfig.users.regular.steamId}&openid.mode=id_res&openid.ns=http://specs.openid.net/auth/2.0&openid.ns.sreg=http://table.com/openid/extensions/sreg/1.1&openid.ns.sreg.nickname=${testConfig.users.regular.username}&openid.ns.sreg.email=test@example.com&openid.op_endpoint=https://steamcommunity.com/openid/login`
        }
      });
    });

    await page.route('**/api/auth/steam/return*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: 1,
            steamId: testConfig.users.regular.steamId,
            username: testConfig.users.regular.username,
            displayName: testConfig.users.regular.displayName,
            avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fc/fc0e5b3d6c7e948b0c6e9672b5e9e9b5e9e9b5e9.jpg',
            role: 'USER'
          }
        })
      });
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('Steam OAuth login flow', async () => {
    console.log('🧪 Testing Steam OAuth login flow...');

    // Navigate to login page
    await page.goto('/auth/login');
    await expect(page).toHaveTitle(/Login/);

    // Verify Steam login button exists
    const steamLoginButton = page.locator('button:has-text("Login with Steam")');
    await expect(steamLoginButton).toBeVisible();
    await expect(steamLoginButton).toBeEnabled();

    // Mock successful Steam authentication
    const [response] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/auth/steam/return')),
      steamLoginButton.click()
    ]);

    // Verify successful authentication
    expect(response.status()).toBe(200);
    const authData = await response.json();
    expect(authData.accessToken).toBeTruthy();
    expect(authData.user.steamId).toBe(testConfig.users.regular.steamId);

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();

    // Verify user information is displayed
    await expect(page.locator(`text=${testConfig.users.regular.displayName}`)).toBeVisible();

    console.log('✅ Steam OAuth login flow completed successfully');
  });

  test('Trade URL setup', async () => {
    console.log('🧪 Testing trade URL setup...');

    // First authenticate the user
    await page.goto('/auth/login');

    // Mock the authentication flow
    const [authResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/auth/steam/return')),
      page.evaluate(() => {
        window.location.href = '/api/auth/steam/return?openid.claimed_id=http://steamcommunity.com/profiles/76561198012345678&openid.identity=http://steamcommunity.com/profiles/76561198012345678&openid.mode=id_res';
      })
    ]);

    // Navigate to profile page
    await page.goto('/profile');

    // Verify trade URL form exists
    const tradeUrlInput = page.locator('input[name="tradeUrl"]');
    const saveButton = page.locator('button:has-text("Save Trade URL")');

    await expect(tradeUrlInput).toBeVisible();
    await expect(saveButton).toBeVisible();

    // Test invalid trade URL
    await tradeUrlInput.fill('invalid-url');
    await saveButton.click();

    // Verify validation error
    await expect(page.locator('text=Please enter a valid Steam trade URL')).toBeVisible();

    // Test valid trade URL
    await tradeUrlInput.fill(testConfig.users.regular.tradeUrl);
    await saveButton.click();

    // Wait for success message
    await expect(page.locator('text=Trade URL saved successfully')).toBeVisible();

    // Verify the URL is saved and displayed
    await expect(tradeUrlInput).toHaveValue(testConfig.users.regular.tradeUrl);

    console.log('✅ Trade URL setup completed successfully');
  });

  test('Session persistence', async () => {
    console.log('🧪 Testing session persistence...');

    // Authenticate user and set JWT tokens
    await page.goto('/auth/login');

    // Mock JWT storage
    await page.evaluate((config) => {
      localStorage.setItem('accessToken', 'mock-access-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        steamId: config.users.regular.steamId,
        username: config.users.regular.username,
        displayName: config.users.regular.displayName,
        role: 'USER'
      }));
    }, testConfig);

    // Navigate directly to protected route
    await page.goto('/dashboard');

    // Verify user is still authenticated
    await expect(page.locator(`text=${testConfig.users.regular.displayName}`)).toBeVisible();
    await expect(page.locator('text=Welcome')).toBeVisible();

    // Test page refresh
    await page.reload();
    await expect(page.locator(`text=${testConfig.users.regular.displayName}`)).toBeVisible();

    // Test token refresh on expiry
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'expired-token');
    });

    // Mock token refresh response
    await page.route('**/api/auth/refresh', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        })
      });
    });

    // Trigger an API call that would require token refresh
    await page.goto('/api/auth/me');

    // Verify new token is stored
    const newToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(newToken).toBe('new-access-token');

    console.log('✅ Session persistence completed successfully');
  });

  test('Logout flow', async () => {
    console.log('🧪 Testing logout flow...');

    // First authenticate the user
    await page.goto('/auth/login');

    // Mock authentication
    await page.evaluate((config) => {
      localStorage.setItem('accessToken', 'mock-access-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        steamId: config.users.regular.steamId,
        username: config.users.regular.username,
        displayName: config.users.regular.displayName,
        role: 'USER'
      }));
    }, testConfig);

    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator(`text=${testConfig.users.regular.displayName}`)).toBeVisible();

    // Mock logout API response
    await page.route('**/api/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Click logout button
    const logoutButton = page.locator('button:has-text("Logout")');
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Verify tokens are cleared
    await page.waitForTimeout(1000); // Wait for logout to complete
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));
    const user = await page.evaluate(() => localStorage.getItem('user'));

    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
    expect(user).toBeNull();

    // Verify redirect to landing page
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Steam Marketplace')).toBeVisible();

    console.log('✅ Logout flow completed successfully');
  });

  test('Admin role assignment', async () => {
    console.log('🧪 Testing admin role assignment...');

    // Test with admin user
    await page.goto('/auth/login');

    // Mock admin user authentication
    await page.evaluate((config) => {
      localStorage.setItem('accessToken', 'mock-admin-access-token');
      localStorage.setItem('refreshToken', 'mock-admin-refresh-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        steamId: config.users.admin.steamId,
        username: config.users.admin.username,
        displayName: config.users.admin.displayName,
        role: 'ADMIN'
      }));
    }, testConfig);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Verify admin user sees admin features
    await expect(page.locator('text=Admin Panel')).toBeVisible();
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Navigate to admin panel
    await page.click('text=Admin Panel');
    await expect(page).toHaveURL('/admin');

    // Verify admin dashboard loads
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();

    console.log('✅ Admin role assignment completed successfully');
  });

  test('Rate limiting on trade URL updates', async () => {
    console.log('🧪 Testing rate limiting...');

    // Authenticate user
    await page.goto('/auth/login');
    await page.evaluate((config) => {
      localStorage.setItem('accessToken', 'mock-access-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        steamId: config.users.regular.steamId,
        username: config.users.regular.username,
        role: 'USER'
      }));
    }, testConfig);

    // Navigate to profile
    await page.goto('/profile');

    // Mock rate limiting response
    let requestCount = 0;
    await page.route('**/api/auth/trade-url', async route => {
      requestCount++;
      if (requestCount > 5) {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Too Many Requests',
            message: 'Too many trade URL updates. Please try again later.',
            retryAfter: 60
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    const tradeUrlInput = page.locator('input[name="tradeUrl"]');
    const saveButton = page.locator('button:has-text("Save Trade URL")');

    // Rapidly click save button to trigger rate limiting
    for (let i = 0; i < 7; i++) {
      await tradeUrlInput.fill(`https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=test${i}`);
      await saveButton.click();
      await page.waitForTimeout(100);
    }

    // Verify rate limit error message
    await expect(page.locator('text=Too many trade URL updates')).toBeVisible();

    console.log('✅ Rate limiting test completed successfully');
  });

  test('Error handling for Steam API failures', async () => {
    console.log('🧪 Testing Steam API error handling...');

    // Mock Steam API failure
    await page.route('**/steamcommunity.com/openid/login*', async route => {
      await route.abort('connectionfailed');
    });

    await page.goto('/auth/login');

    const steamLoginButton = page.locator('button:has-text("Login with Steam")');
    await steamLoginButton.click();

    // Verify error handling
    await expect(page.locator('text=Unable to connect to Steam')).toBeVisible();
    await expect(page.locator('text=Please try again later')).toBeVisible();

    console.log('✅ Steam API error handling completed successfully');
  });
});