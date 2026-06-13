/**
 * E2E Test Suite
 * Basic tests for critical flows
 * Run with: node tests/e2e.test.js
 */

const axios = require('axios');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

// Test results
const results = { passed: 0, failed: 0, tests: [] };

// Helper function
async function test(name, fn) {
    try {
        await fn();
        results.passed++;
        results.tests.push({ name, status: '✅ PASSED' });
        console.log(`✅ ${name}`);
    } catch (err) {
        results.failed++;
        results.tests.push({ name, status: '❌ FAILED', error: err.message });
        console.log(`❌ ${name}: ${err.message}`);
    }
}

function expect(actual) {
    return {
        toBe: (expected) => {
            if (actual !== expected) {
                throw new Error(`Expected ${expected}, got ${actual}`);
            }
        },
        toBeGreaterThan: (expected) => {
            if (!(actual > expected)) {
                throw new Error(`Expected ${actual} to be greater than ${expected}`);
            }
        },
        toBeTruthy: () => {
            if (!actual) {
                throw new Error(`Expected truthy value, got ${actual}`);
            }
        },
        toContain: (expected) => {
            if (!actual.includes(expected)) {
                throw new Error(`Expected "${actual}" to contain "${expected}"`);
            }
        }
    };
}

// ==================== TESTS ====================

async function runTests() {
    console.log('\n🧪 Running E2E Tests...\n');

    // Health Check Tests
    await test('Health endpoint returns OK', async () => {
        const res = await axios.get(`${BASE_URL}/api/health`);
        expect(res.status).toBe(200);
        expect(res.data.status).toBe('OK');
    });

    await test('Health endpoint has required fields', async () => {
        const res = await axios.get(`${BASE_URL}/api/health`);
        expect(res.data.steam_configured !== undefined).toBeTruthy();
        expect(res.data.escrow_enabled !== undefined).toBeTruthy();
        expect(res.data.websocket_enabled !== undefined).toBeTruthy();
    });

    // Auth Tests
    await test('Auth check returns without error', async () => {
        const res = await axios.get(`${BASE_URL}/auth/check`, {
            validateStatus: () => true
        });
        expect(res.status).toBe(200);
        expect(res.data.authenticated !== undefined).toBeTruthy();
    });

    await test('Steam login redirects to Steam', async () => {
        const res = await axios.get(`${BASE_URL}/auth/steam`, {
            maxRedirects: 0,
            validateStatus: () => true
        });
        // Should redirect (302) to Steam
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('steamcommunity.com');
    });

    // API Protection Tests
    await test('Admin routes require auth', async () => {
        const res = await axios.get(`${BASE_URL}/api/admin/dashboard`, {
            validateStatus: () => true
        });
        expect(res.status).toBe(401);
    });

    await test('Admin login rate limited after 5 attempts', async () => {
        // Make 6 requests to trigger rate limit
        let lastStatus = 200;
        for (let i = 0; i < 6; i++) {
            const res = await axios.post(`${BASE_URL}/api/admin/login`, {
                username: 'test',
                password: 'wrong'
            }, { validateStatus: () => true });
            lastStatus = res.status;
        }
        expect(lastStatus).toBe(429);
    });

    // P2P Routes
    await test('P2P listings endpoint exists', async () => {
        const res = await axios.get(`${BASE_URL}/api/p2p/listings`, {
            validateStatus: () => true
        });
        // Any valid response means endpoint exists
        expect(res.status < 500).toBeTruthy();
    });

    // Escrow Routes
    await test('Escrow listings endpoint returns data', async () => {
        const res = await axios.get(`${BASE_URL}/api/escrow/listings`, {
            validateStatus: () => true
        });
        expect(res.status).toBe(200);
    });

    // 404 Handling
    await test('Unknown routes return 404 with proper format', async () => {
        const res = await axios.get(`${BASE_URL}/api/nonexistent`, {
            validateStatus: () => true
        });
        expect(res.status).toBe(404);
        expect(res.data.success).toBe(false);
    });

    // Print Summary
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Results: ${results.passed} passed, ${results.failed} failed`);
    console.log('='.repeat(50) + '\n');

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
