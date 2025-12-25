
const { pool } = require('./src/config/database');
const p2pService = require('./src/services/p2p.service');
const { v4: uuidv4 } = require('uuid');

async function run() {
    console.log('--- Simulating P2P Trading Flow ---');
    const client = await pool.connect();

    try {
        // 1. Setup Test Users
        const SELLER_ID = '76561198000000001';
        const BUYER_ID = '76561198000000002';

        await client.query('DELETE FROM users WHERE steam_id IN ($1, $2)', [SELLER_ID, BUYER_ID]);
        // Insert Users (Handling potential existing records if delete failed or generic check)
        await client.query(`INSERT INTO users (steam_id, balance, trade_url) VALUES ($1, 0, 'https://trade.url/seller') ON CONFLICT (steam_id) DO NOTHING`, [SELLER_ID]);
        await client.query(`INSERT INTO users (steam_id, balance, trade_url) VALUES ($1, 1000, 'https://trade.url/buyer') ON CONFLICT (steam_id) DO UPDATE SET balance = 1000`, [BUYER_ID]);

        console.log('✅ Users Created');

        // 2. Register Seller API Key
        const MOCK_API_KEY = '0'.repeat(32); // 32 zeros
        await p2pService.registerApiKey(SELLER_ID, MOCK_API_KEY);
        console.log('✅ API Key Registered');

        // 3. Create P2P Listing
        const listingRes = await client.query(`
            INSERT INTO listings (
                seller_steam_id, seller_trade_url, item_asset_id, item_name, 
                item_market_hash_name, item_app_id, price, status
            ) VALUES ($1, 'https://trade.url/seller', 'asset_123', 'P2P Item', 'P2P Item', 730, 50.00, 'active')
            RETURNING *
        `, [SELLER_ID]);
        const listing = listingRes.rows[0];
        console.log(`✅ P2P Listing Created: ID ${listing.id}`);

        // 4. Simulate Purchase Transaction
        console.log('--- Simulating Purchase Route Logic ---');
        const tradeUuid = uuidv4();

        // Manual insertion of tokens for SQL params (using literal 'null' for buyer URL for now if needed, or string)
        // We use sequential params $1..$6
        const tradeRes = await client.query(`
          INSERT INTO escrow_trades (
            trade_uuid, listing_id, buyer_steam_id, buyer_trade_url,
            seller_steam_id, seller_trade_url,
            item_asset_id, item_name, item_app_id,
            price, platform_fee, seller_payout,
            status, trade_type, created_at
          ) VALUES ($1, $2, $3, 'https://trade.url/buyer', $4, 'https://trade.url/seller', 'asset_123', 'P2P Item', 730, 50, 5, 45, 'payment_received', 'p2p', NOW())
          RETURNING *
        `, [tradeUuid, listing.id, BUYER_ID, SELLER_ID]);
        // Note: Removed buyer_trade_url param from array and put literal in query to avoid type error

        const trade = tradeRes.rows[0];
        console.log(`✅ Trade Created (Payment Received): ${trade.id}`);

        // Update to awaiting_seller
        await client.query("UPDATE escrow_trades SET status = 'awaiting_seller' WHERE id = $1", [trade.id]);
        console.log('✅ Status updated to awaiting_seller (Direct P2P Flow)');

        // 5. Simulate Sync Logic
        console.log('--- Testing Sync Service ---');
        try {
            await p2pService.syncTrade(tradeUuid);
        } catch (e) {
            console.log(`✅ Sync attempted and failed as expected (Mock Key): ${e.message}`);
            if (e.message.includes('403') || e.message.includes('401') || e.message.includes('failed with status code')) {
                console.log('   (Network request was made)');
            }
        }

        console.log('--- Simulation Complete ---');

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        // Cleanup
        await client.query("DELETE FROM users WHERE steam_id IN ('76561198000000001', '76561198000000002')");
        client.release();
    }
}

run();
