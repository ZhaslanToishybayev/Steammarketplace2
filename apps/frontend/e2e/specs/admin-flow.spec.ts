import { test, expect } from '@playwright/test';
import { mockAdminStats, mockAdminLoginSuccess } from '../mocks/admin.mock';

test.describe('Admin Panel Security & Dashboard', () => {

    test('TC-ADM-01: Should redirect unauthenticated users to login', async ({ page }) => {
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/admin\/login/);
        // Corrected text based on actual page content
        await expect(page.locator('h1')).toContainText('Admin Panel');
        await expect(page.getByPlaceholder('Enter username')).toBeVisible();
    });

    test('TC-ADM-02: Should load dashboard with mocked data when authenticated', async ({ context, page }) => {
        // ... (mocks setup remains same) ...
        await context.route('**/api/admin/verify', async route => {
            await route.fulfill({ json: { success: true, admin: mockAdminLoginSuccess.data.admin } });
        });

        await context.route('**/api/admin/analytics/dashboard', async route => {
            await route.fulfill({ json: mockAdminStats });
        });

        // 2. Inject Token
        await page.goto('/admin/login'); 
        await page.evaluate(() => {
            localStorage.setItem('admin_token', 'mock-admin-token-xyz');
        });

        // 3. Navigate
        await page.goto('/admin');

        // 4. Verification
        // Use more specific locator for Dashboard title to avoid confusing with Sidebar title
        // The dashboard title has "📊 Admin Dashboard"
        await expect(page.locator('h1', { hasText: 'Admin Dashboard' })).toBeVisible();
        
        // Check Revenue
        await expect(page.getByText('$1,234.56')).toBeVisible();
    });

    test('TC-ADM-03: Login Form Submission Flow', async ({ context, page }) => {
        // ... (mocks setup remains same) ...
        await context.route('**/api/admin/login', async route => {
            await route.fulfill({ json: mockAdminLoginSuccess });
        });
        
        await context.route('**/api/admin/verify', async route => {
             await route.fulfill({ json: { success: true, admin: mockAdminLoginSuccess.data.admin } });
        });
        
        await context.route('**/api/admin/analytics/dashboard', async route => {
            await route.fulfill({ json: mockAdminStats });
        });

        await page.goto('/admin/login');

        // Fill form
        await page.getByPlaceholder('Enter username').fill('admin');
        await page.getByPlaceholder('Enter password').fill('password123');
        
        // Corrected Button Text "Sign In"
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Expect Redirect
        await expect(page).toHaveURL(/\/admin/);
    });

});
