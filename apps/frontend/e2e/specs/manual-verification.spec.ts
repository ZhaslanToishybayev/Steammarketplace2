import { test, expect } from '@playwright/test';

test('Manual Verification: Admin Login & Dashboard Load', async ({ page }) => {
    // 1. Go to Login Page
    await page.goto('/admin/login');
    
    // 2. Fill Credentials (Default from migration)
    await page.getByPlaceholder('Enter username').fill('admin');
    await page.getByPlaceholder('Enter password').fill('admin123');
    
    // 3. Click Sign In
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // 4. Wait for Dashboard to Load
    try {
        await expect(page).toHaveURL(/\/admin/);
        // Correct title is "Dashboard", not "Admin Dashboard"
        await expect(page.locator('h1', { hasText: /^Dashboard$/ })).toBeVisible({ timeout: 15000 });
    } catch (e) {
        console.log('❌ Test Failed. Dumping page content...');
        const content = await page.content();
        console.log(content);
        throw e;
    }
    
    // 5. Take Screenshot of success
    await page.screenshot({ path: 'admin-dashboard-verified.png', fullPage: true });
    
    console.log('✅ Admin Login Verified. Screenshot saved to admin-dashboard-verified.png');
});
