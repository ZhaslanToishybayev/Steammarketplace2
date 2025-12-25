require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

console.log('--- DIAGNOSTIC START ---');
console.log('1. Checking ENV...');
console.log('STEAM_API_KEY:', process.env.STEAM_API_KEY ? 'Set ✅' : 'Missing ❌');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✅' : 'Missing ❌');

async function run() {
    // Check DB
    if (process.env.DATABASE_URL) {
        console.log('\n2. Checking Database...');
        try {
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            const client = await pool.connect();
            console.log('DB Connection: Success ✅');

            // Check Listings
            try {
                const res = await client.query("SELECT count(*) FROM listings WHERE status = 'active'");
                console.log('Active Listings in Marketplace:', res.rows[0].count);
            } catch (e) {
                console.log('Table "listings" query failed:', e.message);
            }

            try {
                const trades = await client.query("SELECT count(*) FROM trades");
                console.log('Total Trades:', trades.rows[0].count);
            } catch (e) {
                console.log('Table "trades" query failed:', e.message);
            }

            client.release();
            await pool.end();
        } catch (e) {
            console.log('DB Connection Failed ❌:', e.message);
        }
    }

    // Check Inventory API (Internal Loopback)
    console.log('\n3. Checking Inventory API...');
    try {
        // simple test ID
        const TEST_ID = '76561198034202275';
        console.log(`Fetching inventory for ${TEST_ID}...`);

        const PORT = process.env.PORT || 3001;
        const url = `http://localhost:${PORT}/api/inventory/test/${TEST_ID}`;
        const resp = await axios.get(url, { timeout: 10000 });
        console.log('Inventory API Request: Success ✅');
        console.log('Item Count:', resp.data.count);
    } catch (e) {
        console.log('Inventory API Request Failed ❌:', e.message);
        if (e.response) console.log('Response Status:', e.response.status);
    }
}

run();
