/**
 * E2E Test Suite for Steam Marketplace
 * Using Playwright for browser automation
 * 
 * Run: npx playwright test
 * Setup: npm install -D @playwright/test && npx playwright install
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3001';

// ========== HEALTH CHECK TESTS ==========

test.describe('Health Checks', () => {
    test('API liveness probe returns 200', async ({ request }) => {
        const response = await request.get(`${API_URL}/health/live`);
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('alive');
    });

    test('API readiness probe returns status', async ({ request }) => {
        const response = await request.get(`${API_URL}/health/ready`);
        // Can be 200 (ready) or 503 (not ready), but should return valid JSON
        expect([200, 503]).toContain(response.status());

        const body = await response.json();
        expect(body).toHaveProperty('checks');
        expect(body).toHaveProperty('timestamp');
    });

    test('Legacy health endpoint returns OK', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/health`);
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('OK');
        expect(body.service).toBe('Steam Marketplace API');
    });
});

// ========== HOMEPAGE TESTS ==========

test.describe('Homepage', () => {
    test('loads successfully', async ({ page }) => {
        await page.goto(BASE_URL);

        // Check page title
        await expect(page).toHaveTitle(/Steam Marketplace/i);

        // Check navbar is visible
        await expect(page.locator('nav')).toBeVisible();
    });

    test('has login button', async ({ page }) => {
        await page.goto(BASE_URL);

        // Look for Steam login button
        const loginButton = page.getByRole('button', { name: /login|sign in|steam/i });
        // Or link
        const loginLink = page.getByRole('link', { name: /login|sign in|steam/i });

        // One of them should exist
        const hasLoginButton = await loginButton.count() > 0;
        const hasLoginLink = await loginLink.count() > 0;
        expect(hasLoginButton || hasLoginLink).toBe(true);
    });
});

// ========== MARKETPLACE TESTS ==========

test.describe('Marketplace', () => {
    test('marketplace page loads', async ({ page }) => {
        await page.goto(`${BASE_URL}/marketplace`);

        // Should not redirect to error page
        await expect(page).toHaveURL(/marketplace/);
    });

    test('marketplace API returns listings', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/escrow/listings?limit=10`);
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty('data');
        expect(Array.isArray(body.data)).toBe(true);
    });
});

// ========== API ENDPOINT TESTS ==========

test.describe('API Endpoints', () => {
    test('inventory endpoint requires authentication', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/inventory/cs2`);
        // Should return 400 (no steamid) or 401 (not authenticated)
        expect([400, 401]).toContain(response.status());
    });

    test('wallet endpoint requires authentication', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/wallet/balance`);
        // Should return 401 (not authenticated)
        expect(response.status()).toBe(401);
    });

    test('admin endpoint requires authentication', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/admin/stats`);
        // Should return 401 or 403
        expect([401, 403]).toContain(response.status());
    });
});

// ========== NAVIGATION TESTS ==========

test.describe('Navigation', () => {
    test('can navigate between pages', async ({ page }) => {
        await page.goto(BASE_URL);

        // Find and click marketplace link
        const marketplaceLink = page.getByRole('link', { name: /marketplace|market|shop/i }).first();
        if (await marketplaceLink.count() > 0) {
            await marketplaceLink.click();
            await expect(page).toHaveURL(/marketplace/);
        }
    });

    test('footer is visible on all pages', async ({ page }) => {
        // Check homepage
        await page.goto(BASE_URL);
        await expect(page.locator('footer')).toBeVisible();

        // Check marketplace
        await page.goto(`${BASE_URL}/marketplace`);
        await expect(page.locator('footer')).toBeVisible();
    });
});

// ========== PERFORMANCE TESTS ==========

test.describe('Performance', () => {
    test('homepage loads in under 5 seconds', async ({ page }) => {
        const start = Date.now();
        await page.goto(BASE_URL);
        const loadTime = Date.now() - start;

        expect(loadTime).toBeLessThan(5000);
        console.log(`Homepage load time: ${loadTime}ms`);
    });

    test('API health check responds in under 1 second', async ({ request }) => {
        const start = Date.now();
        await request.get(`${API_URL}/api/health`);
        const responseTime = Date.now() - start;

        expect(responseTime).toBeLessThan(1000);
        console.log(`Health check response time: ${responseTime}ms`);
    });
});
