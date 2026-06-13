const { pool } = require('./src/config/database');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const BOT_STEAM_ID = '76561199736802319';
const BUYER_STEAM_ID = '76561198000000002';
const API_URL = 'http://localhost:3001/api/escrow';

async function runSimulation() {
    const client = await pool.connect();
    try {
        console.log('--- Starting Purchase (Withdraw) Simulation ---');

        // 1. Setup Buyer with Balance
        console.log(`Setting up buyer ${BUYER_STEAM_ID} with balance...`);
        const userCheck = await client.query('SELECT * FROM users WHERE steam_id = $1', [BUYER_STEAM_ID]);
        if (userCheck.rows.length === 0) {
            await client.query('INSERT INTO users (steam_id, balance, trade_url) VALUES ($1, 1000.00, $2)', [BUYER_STEAM_ID, 'https://test.com']);
        } else {
            await client.query('UPDATE users SET balance = 1000.00 WHERE steam_id = $1', [BUYER_STEAM_ID]);
        }

        // 2. Create Bot Listing (Simulate an item previously deposited)
        console.log('Creating "Bot Store" listing...');
        const listingRes = await client.query(`
            INSERT INTO listings (
                seller_steam_id, seller_trade_url, item_asset_id, item_name, 
                item_market_hash_name, item_app_id, price, currency, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING id
        `, [
            BOT_STEAM_ID,
            'https://steamcommunity.com/tradeoffer/new/?partner=BOT',
            'ASSET_123_' + Date.now(), // Unique asset
            'Simulation Item',
            'Simulation Item',
            730,
            10.00,
            'USD',
            'active'
        ]);
        const listingId = listingRes.rows[0].id;
        console.log(`Listing created with ID: ${listingId}`);

        // 3. Execute Buy API Call
        console.log('Executing Buy Request...');
        try {
            const res = await axios.post(`${API_URL}/buy/${listingId}?test_user=${BUYER_STEAM_ID}`);

            console.log('Response:', res.data);
            if (res.data.success) {
                console.log('✅ Buy successful via API');
            } else {
                console.error('❌ Buy failed API check:', res.data);
            }

            const tradeUuid = res.data.data.trade_uuid;

            // 4. Verify DB State
            const tradeRes = await client.query('SELECT * FROM escrow_trades WHERE trade_uuid = $1', [tradeUuid]);
            const trade = tradeRes.rows[0];

            console.log('--- DB Verification ---');
            console.log(`Trade Status: ${trade.status}`);
            console.log(`Trade Type: ${trade.trade_type}`);
            console.log(`Bot ID: ${trade.bot_id}`);

            if (trade.status === 'awaiting_buyer' && trade.trade_type === 'bot_sale') {
                console.log('✅ Trade is correctly in "awaiting_buyer" mode for bot sale.');
            } else {
                console.error('❌ Unexpected trade state.');
            }

            // Check Balance Deducted
            const userEnd = await client.query('SELECT balance FROM users WHERE steam_id = $1', [BUYER_STEAM_ID]);
            console.log(`User Balance: ${userEnd.rows[0].balance} (Should be 990.00)`);

            if (parseFloat(userEnd.rows[0].balance) === 990.00) {
                console.log('✅ Balance correctly deducted.');
            } else {
                console.error('❌ Balance incorrect.');
            }

        } catch (e) {
            console.error('❌ API Request Failed:', e.response ? e.response.data : e.message);
        }

    } catch (err) {
        console.error('Simulation Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runSimulation();
