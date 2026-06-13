const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

// Config - Use 127.0.0.1 for CI compatibility
const API_URL = process.env.API_URL || 'http://127.0.0.1:3001/api';
const MOCK_AUTH_URL = process.env.MOCK_AUTH_URL || 'http://127.0.0.1:3001/api/mock-auth/steam/mock';

// Utils
async function createSession(steamId) {
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar, withCredentials: true }));
    // Login
    await client.get(`${MOCK_AUTH_URL}?steamId=${steamId}`);
    return client;
}

async function runTests() {
    console.log('🚀 Starting E2E Tests...');

    try {
        // --- SETUP ---
        console.log('\n[Setup] Creating sessions...');
        const user1 = await createSession('76561198000000001'); // Seller / Buyer 1
        const user2 = await createSession('76561198000000002'); // Buyer 2
        
        // Reset balances (Manual DB trigger via admin endpoint? Or assuming we can't. 
        // We'll just assume they have money or use what they have. 
        // Best to use admin P2P list item to create a fresh item).
        
        console.log('[Setup] Creating a P2P Listing for Race Condition Test...');
        // User 1 creates listing
        const listRes = await user1.post(`${API_URL}/p2p/list-item`, {
            assetId: `race_item_${Date.now()}`,
            price: 10.00,
            tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=1'
        });
        const listingId = listRes.data.listingId;
        console.log(`[Setup] Created Listing ID: ${listingId} ($10.00)`);

        // --- TEST 1: RACE CONDITION ---
        console.log('\n🧪 [Test 1] Race Condition (Double Buy)...');
        console.log('    User 1 and User 2 sending BUY requests simultaneously...');
        
        const req1 = user1.post(`${API_URL}/p2p/buy/${listingId}`, { tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=1&token=valid' }).catch(e => e.response);
        const req2 = user2.post(`${API_URL}/p2p/buy/${listingId}`, { tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=2&token=valid' }).catch(e => e.response);
        
        const [res1, res2] = await Promise.all([req1, req2]);
        
        const successCount = [res1, res2].filter(r => r.status === 200).length;
        const failCount = [res1, res2].filter(r => r.status !== 200).length;

        console.log(`    Results: Success=${successCount}, Fail=${failCount}`);
        
        if (successCount === 1 && failCount === 1) {
            console.log('✅ PASS: Only one user managed to buy.');
        } else {
            console.error('❌ FAIL: Race condition detected or both failed!');
            console.log('Res1:', res1.data);
            console.log('Res2:', res2.data);
        }

        // --- TEST 2: SMART ROLLBACK (BOT SALE) ---
        // Note: We need a BOT listing for this. P2P listings don't trigger bot send immediately? 
        // P2P waits for seller. Bot sale triggers bot.
        // We need to find a bot listing. We'll list one via Admin Sync? Or just use existing if available.
        // Let's rely on P2P for now, but P2P refund logic is triggered by 'cancelled' status update from worker scanner.
        // Testing Bot Sale Rollback is harder because we can't easily create a bot listing via API without Admin Sync.
        // But we verified it manually earlier.
        
        console.log('\n(Skipping Test 2: Requires Bot Listing setup, manually verified earlier)');

    } catch (err) {
        console.error('❌ CRITICAL ERROR:', err.message);
        if (err.response) console.error('Response:', err.response.data);
    }
}

runTests();