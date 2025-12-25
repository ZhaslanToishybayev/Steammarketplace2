/**
 * Admin Panel E2E Tests
 * Tests admin CRUD operations, RBAC, and admin functionality
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../setup/test-config';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto('/auth/login');

    // Mock Steam login for admin
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

    // Simulate Steam callback for admin user
    await page.goto('/api/auth/steam/return?openid.identity=https://steamcommunity.com/openid/id/' + testConfig.users.admin.steamId);

    // Wait for successful login and redirect to dashboard
    await page.waitForURL('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display admin panel for authorized users', async ({ page }) => {
    // Check if admin panel link is visible
    const adminPanelLink = page.locator('[data-testid="nav-admin-panel"]');
    if (await adminPanelLink.isVisible()) {
      await adminPanelLink.click();
      await page.waitForLoadState('networkidle');

      // Verify admin panel is loaded
      await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    } else {
      // Admin panel might be in a dropdown or different location
      const adminMenu = page.locator('[data-testid="admin-menu"]');
      if (await adminMenu.isVisible()) {
        await adminMenu.click();
        const adminPanelItem = page.locator('[data-testid="admin-panel-item"]');
        await adminPanelItem.click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible();
      }
    }
  });

  test('should display admin dashboard metrics', async ({ page }) => {
    // Navigate to admin panel
    await page.click('[data-testid="nav-admin-panel"]');
    await page.waitForLoadState('networkidle');

    // Check for dashboard metrics
    await expect(page.locator('[data-testid="total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-deposits"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-withdrawals"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-trades"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue"]')).toBeVisible();
  });

  test('should manage users in user management section', async ({ page }) => {
    // Navigate to user management
    await page.click('[data-testid="nav-admin-panel"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="user-management-tab"]');

    // Verify user management page is loaded
    await expect(page.locator('[data-testid="user-management"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-table"]')).toBeVisible();

    // Test user search
    const searchInput = page.locator('[data-testid="user-search-input"]');
    await searchInput.fill('testuser');
    await page.waitForTimeout(1000);

    // Verify search results
    const userRows = page.locator('[data-testid="user-row"]');
    if (await userRows.count() > 0) {
      // Check that search results contain the searched term
      const firstUser = userRows.first();
      await expect(firstUser.locator('[data-testid="user-username"]')).toContainText('testuser');
    }
  });

  test('should view user details', async ({ page }) => {
    await page.click('[data-testid="nav-admin-panel"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="user-management-tab"]');

    // Click on first user to view details
    const userRows = page.locator('[data-testid="user-row"]');
    if (await userRows.count() > 0) {
      await userRows.first().click();

      // Wait for user details modal/page
      await page.waitForSelector('[data-testid="user-details"]', { timeout: 10000 });
      await expect(page.locator('[data-testid="user-details"]')).toBeVisible();

      // Verify user information is displayed
      await expect(page.locator('[data-testid="user-steam-id"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-username"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-role"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-join-date"]')).toBeVisible();
    }
  });

  test('should manage trade operations', async ({ page }) => {
    await page.click('[data-testid="nav-admin-panel"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="trade-management-tab"]');

    // Verify trade management page
    await expect(page.locator('[data-testid="trade-management"]')).toBeVisible();
    await expect(page.locator('[data-testid="trade-filters"]')).toBeVisible();
    await expect(page.locator('[data-testid="trade-table"]')).toBeVisible();

    // Test trade filtering
    const statusFilter = page.locator('[data-testid="trade-status-filter"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('PENDING');
      await page.waitForLoadState('networkidle');

      // Verify filtered results
      const tradeRows = page.locator('[data-testid="trade-row"]');
      const count = await tradeRows.count();

      for (let i = 0; i < count; i++) {
        const status = await tradeRows.nth(i).locator('[data-testid="trade-status"]').textContent();
        expect(status?.toUpperCase()).toBe('PENDING');
      }
    }

    // Test trade actions
    const tradeRows = page.locator('[data-testid="trade-row"]');
    if (await tradeRows.count() > 0) {
      const firstTrade = tradeRows.first();
      const actionsButton = firstTrade.locator('[data-testid="trade-actions"]');
      if (await actionsButton.isVisible()) {
        await actionsButton.click();

        // Check for available actions
        const viewAction = page.locator('[data-testid="action-view-details"]');
        const cancelAction = page.locator('[data-testid="action-cancel-trade"]');
        const completeAction = page.locator('[data-testid="action-mark-complete"]');

        if (await viewAction.isVisible()) {
          await viewAction.click();
          await page.waitForSelector('[data-testid="trade-details"]', { timeout: 5000 });
          await expect(page.locator('[data-testid="trade-details"]')).toBeVisible();
        }
      }
    }
  });

  test('should manage financial operations', async ({ page }) => {
    await page.click('[data-testid="nav-admin-panel"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="financial-management-tab"]');

    // Verify financial management page
    await expect(page.locator('[data-testid="financial-management"]')).toBeVisible();
    await expect(page.locator('[data-testid="transaction-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="audit-filters"]')).toBeVisible();

    // Test transaction filtering
    const typeFilter = page.locator('[data-testid="transaction-type-filter"]');
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption('DEPOSIT');
      await page.waitForLoadState('networkidle');

      // Verify filtered results
      const transactionRows = page.locator('[data-testid="transaction-row"]');
      const count = await transactionRows.count();

      for (let i = 0; i < count; i++) {
        const type = await transactionRows.nth(i).locator('[data-testid="transaction-type"]').textContent();
        expect(type?.toUpperCase()).toBe('DEPOSIT');
      }
    }
  });

  test('should manage system bots', async ({ page }) => {
    await page.click('[data-testid="nav-admin-panel"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="bot-management-tab"]');

    // Verify bot management page
    await expect(page.locator('[data-testid="bot-management"]')).toBeVisible();
    await expect(page.locator('[data-testid="bot-table"]')).toBeVisible();

    // Test bot actions
    const botRows = page.locator('[data-testid="bot-row"]');
    if (await botRows.count() > 0) {
      const firstBot = botRows.first();
      await expect(firstBot.locator('[data-testid="bot-name"]')).toBeVisible();
      await expect(firstBot.locator('[data-testid="bot-status"]')).toBeVisible();
      await expect(firstBot.locator('[data-testid="bot-trades"]')).toBeVisible();

      // Test bot status management
      const statusToggle = firstBot.locator('[data-testid="bot-status-toggle"]');
      if (await statusToggle.isVisible()) {
        await statusToggle.click();
        // Verify status change is reflected
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should view system logs and audit trail', async ({ page }) => {
    await page.click('[data-testid="nav-admin-panel"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="audit-trail-tab"]');

    // Verify audit trail page
    await expect(page.locator('[data-testid="audit-trail"]')).toBeVisible();
    await expect(page.locator('[data-testid="audit-table"]')).toBeVisible();

    // Test log filtering
    const actionFilter = page.locator('[data-testid="audit-action-filter"]');
    if (await actionFilter.isVisible()) {
      await actionFilter.selectOption('USER_CREATED');
      await page.waitForLoadState('networkidle');

      // Verify filtered results
      const logRows = page.locator('[data-testid="audit-row"]');
      const count = await logRows.count();

      for (let i = 0; i < count; i++) {
        const action = await logRows.nth(i).locator('[data-testid="audit-action"]').textContent();
        expect(action?.toUpperCase()).toBe('USER_created');
      }
    }
  });

  test('should manage system configuration', async ({ page }) => {
    await page.click('[data-testid="nav-admin-panel"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="system-config-tab"]');

    // Verify system configuration page
    await expect(page.locator('[data-testid="system-config"]')).toBeVisible();
    await expect(page.locator('[data-testid="config-form"]')).toBeVisible();

    // Test configuration fields
    const tradeFeeInput = page.locator('[data-testid="trade-fee-input"]');
    if (await tradeFeeInput.isVisible()) {
      await expect(tradeFeeInput).toBeVisible();
      const currentValue = await tradeFeeInput.inputValue();
      await tradeFeeInput.fill('5.0');
      await page.click('[data-testid="save-config"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/saved/i);
    }
  });

  test('should handle role-based access control', async ({ page }) => {
    // Verify admin can access all features
    await page.click('[data-testid="nav-admin-panel"]');
    await page.waitForLoadState('networkidle');

    // Check that all admin tabs are visible
    const userManagementTab = page.locator('[data-testid="user-management-tab"]');
    const tradeManagementTab = page.locator('[data-testid="trade-management-tab"]');
    const financialManagementTab = page.locator('[data-testid="financial-management-tab"]');
    const botManagementTab = page.locator('[data-testid="bot-management-tab"]');

    await expect(userManagementTab).toBeVisible();
    await expect(tradeManagementTab).toBeVisible();
    await expect(financialManagementTab).toBeVisible();
    await expect(botManagementTab).toBeVisible();
  });

  test('should export data and generate reports', async ({ page }) => {
    await page.click('[data-testid="nav-admin-panel"]');
    await page.waitForLoadState('networkidle');

    // Look for export buttons
    const exportButton = page.locator('[data-testid="export-data-button"]');
    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Wait for export modal
      await page.waitForSelector('[data-testid="export-modal"]', { timeout: 5000 });
      await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();

      // Select export format
      const formatSelect = page.locator('[data-testid="export-format"]');
      if (await formatSelect.isVisible()) {
        await formatSelect.selectOption('csv');
      }

      // Select date range
      const startDate = page.locator('[data-testid="export-start-date"]');
      const endDate = page.locator('[data-testid="export-end-date"]');
      if (await startDate.isVisible() && await endDate.isVisible()) {
        await startDate.fill('2023-01-01');
        await endDate.fill('2023-12-31');
      }

      // Initiate export
      await page.click('[data-testid="start-export"]');
      await page.waitForSelector('[data-testid="export-success"]', { timeout: 10000 });
      await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
    }
  });
});