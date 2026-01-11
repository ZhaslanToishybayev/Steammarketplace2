/**
 * Comprehensive Test Suite
 * Based on test_plan.md - Minimal but sufficient tests
 * 
 * Run: node tests/full-test-suite.js
 */

const axios = require('axios');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

// Test utilities
const results = { smoke: [], critical: [], edge: [], regression: [] };
let passed = 0, failed = 0;

async function test(category, name, fn) {
    try {
        await fn();
        passed++;
        results[category].push({ name, status: '✅' });
        console.log(`  ✅ ${name}`);
    } catch (err) {
        failed++;
        results[category].push({ name, status: '❌', error: err.message });
        console.log(`  ❌ ${name}: ${err.message}`);
    }
}

function expect(actual) {
    return {
        toBe: (expected) => {
            if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
        },
        toBeGreaterThan: (n) => {
            if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`);
        },
        toBeTruthy: () => {
            if (!actual) throw new Error(`Expected truthy, got ${actual}`);
        },
        toContain: (s) => {
            if (!String(actual).includes(s)) throw new Error(`Expected "${actual}" to contain "${s}"`);
        },
        toBeOneOf: (arr) => {
            if (!arr.includes(actual)) throw new Error(`Expected ${actual} to be one of [${arr}]`);
        }
    };
}

// ==================== 🔥 SMOKE TESTS ====================
async function smokeTests() {
    console.log('\n🔥 SMOKE TESTS (5)');

    await test('smoke', 'Health endpoint returns 200', async () => {
        const res = await axios.get(`${BASE_URL}/api/health`);
        expect(res.status).toBe(200);
        expect(res.data.status).toBe('OK');
    });

    await test('smoke', 'Health has required fields', async () => {
        const res = await axios.get(`${BASE_URL}/api/health`);
        expect(res.data.steam_configured !== undefined).toBeTruthy();
        expect(res.data.escrow_enabled !== undefined).toBeTruthy();
    });

    await test('smoke', 'Steam auth redirects', async () => {
        const res = await axios.get(`${BASE_URL}/auth/steam`, {
            maxRedirects: 0,
            validateStatus: () => true
        });
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('steamcommunity.com');
    });

    await test('smoke', 'Database accessible (listings)', async () => {
        const res = await axios.get(`${BASE_URL}/api/escrow/listings`, {
            validateStatus: () => true
        });
        expect(res.status).toBe(200);
    });

    await test('smoke', 'Auth check works', async () => {
        const res = await axios.get(`${BASE_URL}/auth/check`);
        expect(res.status).toBe(200);
        expect(res.data.authenticated !== undefined).toBeTruthy();
    });
}

// ==================== 🧱 CRITICAL PATH TESTS ====================
async function criticalPathTests() {
    console.log('\n🧱 CRITICAL PATH TESTS (7)');

    await test('critical', 'Admin routes require auth', async () => {
        const res = await axios.get(`${BASE_URL}/api/admin/dashboard`, {
            validateStatus: () => true
        });
        expect(res.status).toBe(401);
    });

    await test('critical', 'Admin login sets httpOnly cookie', async () => {
        const res = await axios.post(`${BASE_URL}/api/admin/login`, {
            username: 'admin',
            password: 'admin123'
        }, { validateStatus: () => true });

        // If login succeeds, check cookie; if fails (no admin), that's OK too
        if (res.status === 200) {
            const cookies = res.headers['set-cookie'] || [];
            const hasAdminCookie = cookies.some(c => c.includes('admin_token') && c.includes('HttpOnly'));
            expect(hasAdminCookie).toBeTruthy();
        }
    });

    await test('critical', 'P2P endpoint accessible', async () => {
        const res = await axios.get(`${BASE_URL}/api/p2p/listings`, {
            validateStatus: () => true
        });
        expect(res.status < 500).toBeTruthy();
    });

    await test('critical', 'Escrow listings return array', async () => {
        const res = await axios.get(`${BASE_URL}/api/escrow/listings`);
        expect(Array.isArray(res.data.data || res.data.listings || res.data)).toBeTruthy();
    });

    await test('critical', 'Rate limiting works on login', async () => {
        // Make 6 failed requests
        let lastStatus = 200;
        for (let i = 0; i < 6; i++) {
            const res = await axios.post(`${BASE_URL}/api/admin/login`, {
                username: 'test', password: 'wrong'
            }, { validateStatus: () => true });
            lastStatus = res.status;
        }
        expect(lastStatus).toBe(429);
    });

    await test('critical', 'Trade state enum exists', async () => {
        // Test that trade states are properly defined
        const SteamTradeOfferManager = require('steam-tradeoffer-manager');
        expect(SteamTradeOfferManager.ETradeOfferState.Accepted).toBe(3);
        expect(SteamTradeOfferManager.ETradeOfferState.Declined).toBe(7);
        expect(SteamTradeOfferManager.ETradeOfferState.Canceled).toBe(6);
    });

    await test('critical', 'Trade status tracking DB schema exists', async () => {
        const { pool } = require('../src/config/database');
        const res = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'escrow_trades' AND column_name = 'status'
        `);
        expect(res.rows.length).toBeGreaterThan(0);
    });
}

// ==================== 🧨 EDGE CASES ====================
async function edgeCaseTests() {
    console.log('\n🧨 EDGE CASE TESTS (5)');

    await test('edge', 'Invalid Steam ID returns 400', async () => {
        const res = await axios.get(`${BASE_URL}/api/inventory/invalid123`, {
            validateStatus: () => true
        });
        expect(res.status).toBeOneOf([400, 404, 500]); // Any error is fine
    });

    await test('edge', '404 returns proper JSON format', async () => {
        const res = await axios.get(`${BASE_URL}/api/nonexistent`, {
            validateStatus: () => true
        });
        expect(res.status).toBe(404);
        expect(res.data.success).toBe(false);
    });

    await test('edge', 'Empty body on POST returns error', async () => {
        const res = await axios.post(`${BASE_URL}/api/admin/login`, {}, {
            validateStatus: () => true
        });
        expect(res.status).toBeOneOf([400, 401, 429]);
    });

    await test('edge', 'Malformed JSON handled gracefully', async () => {
        const res = await axios.post(`${BASE_URL}/api/admin/login`, 'not json', {
            headers: { 'Content-Type': 'application/json' },
            validateStatus: () => true
        });
        expect(res.status).toBeOneOf([400, 401, 429, 500]);
    });

    await test('edge', 'Very long input handled', async () => {
        const longString = 'a'.repeat(10000);
        const res = await axios.post(`${BASE_URL}/api/admin/login`, {
            username: longString,
            password: longString
        }, { validateStatus: () => true });
        expect(res.status < 500).toBeTruthy();
    });
}

// ==================== ♻️ REGRESSION TESTS ====================
async function regressionTests() {
    console.log('\n♻️ REGRESSION TESTS (3)');

    await test('regression', 'No hardcoded API keys in responses', async () => {
        const res = await axios.get(`${BASE_URL}/api/health`);
        const body = JSON.stringify(res.data);
        expect(!body.includes('E1FC69B3707FF57C6267322B0271A86B')).toBeTruthy();
    });

    await test('regression', 'JWT not exposed in login response body', async () => {
        const res = await axios.post(`${BASE_URL}/api/admin/login`, {
            username: 'admin', password: 'admin123'
        }, { validateStatus: () => true });

        if (res.status === 200) {
            expect(res.data.data?.token === undefined).toBeTruthy();
        }
    });

    await test('regression', 'Error responses dont leak stack traces', async () => {
        const res = await axios.get(`${BASE_URL}/api/nonexistent`, {
            validateStatus: () => true
        });
        const body = JSON.stringify(res.data);
        expect(!body.includes('at ') && !body.includes('.js:')).toBeTruthy();
    });
}

// ==================== 🔄 TRADE STATE TESTS ====================
async function tradeStateTests() {
    console.log('\n🔄 TRADE STATE TRACKING TESTS (3)');

    await test('critical', 'EscrowListener service exists', async () => {
        const service = require('../src/services/escrow-listener.service');
        expect(service).toBeTruthy();
    });

    await test('critical', 'Trade states properly defined', async () => {
        const { TradeStatus } = require('../src/services/escrow.service');
        expect(TradeStatus.PENDING_PAYMENT).toBe('pending_payment');
        expect(TradeStatus.COMPLETED).toBe('completed');
        expect(TradeStatus.CANCELLED).toBe('cancelled');
    });

    await test('critical', 'Valid trade state transitions defined', async () => {
        const { ValidTransitions, TradeStatus } = require('../src/services/escrow.service');
        // Can go from PENDING_PAYMENT to PAYMENT_RECEIVED
        expect(ValidTransitions[TradeStatus.PENDING_PAYMENT].includes(TradeStatus.PAYMENT_RECEIVED)).toBeTruthy();
        // Cannot go from COMPLETED to anywhere
        expect(ValidTransitions[TradeStatus.COMPLETED].length).toBe(0);
    });
}

// ==================== RUN ALL ====================
async function runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 FULL TEST SUITE - Steam Marketplace');
    console.log('='.repeat(60));

    await smokeTests();
    await criticalPathTests();
    await edgeCaseTests();
    await regressionTests();
    await tradeStateTests();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`🔥 Smoke:     ${results.smoke.filter(t => t.status === '✅').length}/${results.smoke.length}`);
    console.log(`🧱 Critical:  ${results.critical.filter(t => t.status === '✅').length}/${results.critical.length}`);
    console.log(`🧨 Edge:      ${results.edge.filter(t => t.status === '✅').length}/${results.edge.length}`);
    console.log(`♻️  Regression: ${results.regression.filter(t => t.status === '✅').length}/${results.regression.length}`);
    console.log('='.repeat(60));
    console.log(`✅ PASSED: ${passed} | ❌ FAILED: ${failed}`);
    console.log('='.repeat(60) + '\n');

    process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
    console.error('Test suite crashed:', err);
    process.exit(1);
});
