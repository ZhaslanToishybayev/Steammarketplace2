const axios = require('axios');
const { Pool } = require('pg');

async function check() {
    console.log('=== SYSTEM VERIFICATION ===');

    // 1. Health Check
    try {
        console.log('1. Checking Backend Health...');
        const health = await axios.get('http://localhost:3001/api/health');
        if (health.data.status === 'OK') {
            console.log('   ✅ Health OK');
            console.log('   Steam Configured:', health.data.steam_configured);
        } else {
            console.log('   ❌ Health Bad:', health.data);
        }
    } catch (e) {
        console.log('   ❌ Backend Unreachable:', e.message);
    }

    // 2. Inventory Check (Real Steam API Check)
    try {
        console.log('\n2. Checking Inventory API (Real Steam Request)...');
        // Using arbitrary public ID (S1mple)
        const steamId = '76561198034202275';
        const url = `http://localhost:3001/api/inventory/test/${steamId}`;
        console.log(`   GET ${url}`);

        const inv = await axios.get(url, { timeout: 15000 });
        if (inv.data.count > 0) {
            console.log(`   ✅ Success! Found ${inv.data.count} items.`);
        } else {
            console.log('   ⚠️ Request Success but 0 items returned.');
            console.log('   Response:', JSON.stringify(inv.data).slice(0, 100));
        }
    } catch (e) {
        console.log('   ❌ Inventory Request Failed');
        if (e.response) {
            console.log('   Status:', e.response.status);
            console.log('   Data:', e.response.data);
        } else {
            console.log('   Error:', e.message);
        }
    }

    // 3. Database Check
    try {
        console.log('\n3. Checking Database (Marketplace)...');
        // Use default URL if env missing logic works
        const dbUrl = process.env.DATABASE_URL || 'postgresql://steam_user:steam_password@localhost:5432/steam_marketplace';
        const pool = new Pool({ connectionString: dbUrl });
        const client = await pool.connect();
        const res = await client.query('SELECT count(*) FROM listings');
        console.log(`   ✅ DB Connected. Active Listings: ${res.rows[0].count}`);
        await client.end();
        await pool.end();
    } catch (e) {
        console.log('   ❌ Database connection failed:', e.message);
    }
}

check();
