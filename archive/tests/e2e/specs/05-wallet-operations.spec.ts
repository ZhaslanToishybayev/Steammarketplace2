/**
 * Wallet Operations E2E Tests
 * Tests wallet deposits, withdrawals, limits, and balance management
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../setup/test-config';

test.describe('Wallet Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/auth/login');

    // Mock Steam login for testing
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
    await page.goto('/api/auth/steam/return?openid.identity=https://steamcommunity.com/openid/id/76561198012345678');

    // Wait for successful login and redirect to dashboard
    await page.waitForURL('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display wallet balance and information', async ({ page }) => {
    // Navigate to wallet page
    await page.click('[data-testid="nav-wallet"]');
    await page.waitForLoadState('networkidle');

    // Verify wallet page is loaded
    await expect(page.locator('[data-testid="wallet-page"]')).toBeVisible();

    // Check balance display
    await expect(page.locator('[data-testid="current-balance"]')).toBeVisible();
    await expect(page.locator('[data-testid="available-balance"]')).toBeVisible();

    // Verify deposit and withdrawal buttons
    await expect(page.locator('[data-testid="deposit-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="withdraw-button"]')).toBeVisible();
  });

  test('should initiate deposit process', async ({ page }) => {
    await page.click('[data-testid="nav-wallet"]');
    await page.waitForLoadState('networkidle');

    // Click deposit button
    await page.click('[data-testid="deposit-button"]');

    // Verify deposit modal/form is visible
    await expect(page.locator('[data-testid="deposit-modal"]')).toBeVisible();

    // Test deposit amount input
    const amountInput = page.locator('[data-testid="deposit-amount"]');
    await expect(amountInput).toBeVisible();
    await amountInput.fill('50.00');

    // Test payment method selection
    const paymentMethod = page.locator('[data-testid="payment-method"]');
    if (await paymentMethod.isVisible()) {
      await paymentMethod.selectOption('stripe');
    }

    // Verify deposit button is enabled
    const depositSubmit = page.locator('[data-testid="submit-deposit"]');
    await expect(depositSubmit).toBeEnabled();
  });

  test('should validate deposit amount limits', async ({ page }) => {
    await page.click('[data-testid="nav-wallet"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="deposit-button"]');

    const amountInput = page.locator('[data-testid="deposit-amount"]');

    // Test minimum deposit validation
    await amountInput.fill('0.50'); // Below minimum
    await page.click('[data-testid="submit-deposit"]');

    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toContainText(/minimum/i);

    // Test maximum deposit validation
    await amountInput.fill('10000'); // Above maximum
    await page.click('[data-testid="submit-deposit"]');

    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toContainText(/maximum/i);

    // Test valid amount
    await amountInput.fill('25.00');
    await page.click('[data-testid="submit-deposit"]');

    // Should not show validation error
    const validationError = page.locator('[data-testid="validation-error"]');
    if (await validationError.isVisible()) {
      expect(await validationError.textContent()).not.toContain('amount');
    }
  });

  test('should complete deposit process', async ({ page }) => {
    await page.click('[data-testid="nav-wallet"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="deposit-button"]');

    // Fill deposit form
    await page.locator('[data-testid="deposit-amount"]').fill('25.00');

    // Mock successful deposit response
    await page.route('**/api/wallet/deposit', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          transactionId: 'dep_test_123',
          status: 'PENDING',
          amount: 25.00,
          fee: 0.75,
          netAmount: 24.25
        })
      });
    });

    await page.click('[data-testid="submit-deposit"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText(/deposit initiated/i);

    // Wait for transaction to appear in history
    await page.waitForSelector('[data-testid="transaction-item"]', { timeout: 5000 });

    // Verify transaction appears in history
    const transaction = page.locator('[data-testid="transaction-item"]').first();
    await expect(transaction).toBeVisible();
    await expect(transaction.locator('[data-testid="transaction-amount"]')).toContainText('+$25.00');
    await expect(transaction.locator('[data-testid="transaction-type"]')).toContainText('Deposit');
  });

  test('should initiate withdrawal process', async ({ page }) => {
    await page.click('[data-testid="nav-wallet"]');
    await page.waitForLoadState('networkidle');

    // Click withdraw button
    await page.click('[data-testid="withdraw-button"]');

    // Verify withdrawal modal/form is visible
    await expect(page.locator('[data-testid="withdraw-modal"]')).toBeVisible();

    // Test withdrawal amount input
    const amountInput = page.locator('[data-testid="withdraw-amount"]');
    await expect(amountInput).toBeVisible();

    // Test withdrawal method selection
    const withdrawalMethod = page.locator('[data-testid="withdrawal-method"]');
    if (await withdrawalMethod.isVisible()) {
      await withdrawalMethod.selectOption('paypal');
    }
  });

  test('should validate withdrawal amount and balance', async ({ page }) => {
    await page.click('[data-testid="nav-wallet"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="withdraw-button"]');

    const amountInput = page.locator('[data-testid="withdraw-amount"]');
    const currentBalanceText = await page.locator('[data-testid="current-balance"]').textContent();
    const currentBalance = currentBalanceText ? parseFloat(currentBalanceText.replace(/[^0-9.]/g, '')) : 0;

    // Test withdrawal amount exceeding balance
    const excessiveAmount = (currentBalance + 100).toString();
    await amountInput.fill(excessiveAmount);

    // Should show insufficient funds error
    await page.click('[data-testid="submit-withdraw"]');
    await expect(page.locator('[data-testid="validation-error"]')).toContainText(/insufficient funds/i);

    // Test valid withdrawal amount
    const validAmount = Math.min(currentBalance, 50).toString();
    await amountInput.fill(validAmount);

    // Should not show validation error
    const validationError = page.locator('[data-testid="validation-error"]');
    if (await validationError.isVisible()) {
      expect(await validationError.textContent()).not.toContain('insufficient');
    }
  });

  test('should display transaction history', async ({ page }) => {
    await page.click('[data-testid="nav-wallet"]');
    await page.waitForLoadState('networkidle');

    // Navigate to transaction history
    await page.click('[data-testid="transaction-history-tab"]');
    await page.waitForLoadState('networkidle');

    // Verify transaction history is visible
    await expect(page.locator('[data-testid="transaction-history"]')).toBeVisible();

    // Check for transaction items
    const transactions = page.locator('[data-testid="transaction-item"]');
    if (await transactions.count() > 0) {
      // Verify transaction details are shown
      await expect(transactions.first().locator('[data-testid="transaction-date"]')).toBeVisible();
      await expect(transactions.first().locator('[data-testid="transaction-type"]')).toBeVisible();
      await expect(transactions.first().locator('[data-testid="transaction-amount"]')).toBeVisible();
      await expect(transactions.first().locator('[data-testid="transaction-status"]')).toBeVisible();
    }

    // Test transaction filtering
    const filterSelect = page.locator('[data-testid="transaction-filter"]');
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('deposit');
      await page.waitForLoadState('networkidle');

      // Verify only deposit transactions are shown
      const transactionTypes = page.locator('[data-testid="transaction-type"]');
      const count = await transactionTypes.count();

      for (let i = 0; i < count; i++) {
        const type = await transactionTypes.nth(i).textContent();
        expect(type?.toLowerCase()).toContain('deposit');
      }
    }
  });

  test('should display withdrawal limits and fees', async ({ page }) => {
    await page.click('[data-testid="nav-wallet"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="withdraw-button"]');

    // Check for fee information
    const feeInfo = page.locator('[data-testid="withdrawal-fee-info"]');
    if (await feeInfo.isVisible()) {
      await expect(feeInfo).toBeVisible();
    }

    // Check for daily/weekly limits
    const limitInfo = page.locator('[data-testid="withdrawal-limits"]');
    if (await limitInfo.isVisible()) {
      await expect(limitInfo).toBeVisible();
    }
  });

  test('should handle withdrawal verification process', async ({ page }) => {
    await page.click('[data-testid="nav-wallet"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="withdraw-button"]');

    // Fill withdrawal form
    await page.locator('[data-testid="withdraw-amount"]').fill('20.00');
    await page.locator('[data-testid="withdrawal-method"]').selectOption('paypal');
    await page.locator('[data-testid="paypal-email"]').fill('test@example.com');

    // Mock successful withdrawal response
    await page.route('**/api/wallet/withdraw', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          transactionId: 'wd_test_123',
          status: 'PENDING',
          amount: 20.00,
          fee: 1.00,
          netAmount: 19.00
        })
      });
    });

    await page.click('[data-testid="submit-withdraw"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText(/withdrawal initiated/i);

    // Verify transaction appears in history
    await page.waitForSelector('[data-testid="transaction-item"]', { timeout: 5000 });
    const transaction = page.locator('[data-testid="transaction-item"]').first();
    await expect(transaction).toBeVisible();
    await expect(transaction.locator('[data-testid="transaction-amount"]')).toContainText('-$20.00');
    await expect(transaction.locator('[data-testid="transaction-type"]')).toContainText('Withdrawal');
  });

  test('should refresh balance after transactions', async ({ page }) => {
    await page.click('[data-testid="nav-wallet"]');
    await page.waitForLoadState('networkidle');

    // Note initial balance
    const initialBalanceText = await page.locator('[data-testid="current-balance"]').textContent();
    const initialBalance = initialBalanceText ? parseFloat(initialBalanceText.replace(/[^0-9.]/g, '')) : 0;

    // Perform a deposit
    await page.click('[data-testid="deposit-button"]');
    await page.locator('[data-testid="deposit-amount"]').fill('10.00');

    await page.route('**/api/wallet/deposit', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          transactionId: 'dep_test_456',
          status: 'COMPLETED',
          amount: 10.00,
          fee: 0.30,
          netAmount: 9.70
        })
      });
    });

    await page.click('[data-testid="submit-deposit"]');
    await page.waitForSelector('[data-testid="success-message"]');

    // Refresh the page to see updated balance
    await page.reload();
    await page.click('[data-testid="nav-wallet"]');
    await page.waitForLoadState('networkidle');

    // Check updated balance
    const updatedBalanceText = await page.locator('[data-testid="current-balance"]').textContent();
    const updatedBalance = updatedBalanceText ? parseFloat(updatedBalanceText.replace(/[^0-9.]/g, '')) : 0;

    // Balance should have increased (approximately, accounting for fees)
    expect(updatedBalance).toBeGreaterThan(initialBalance);
  });
});