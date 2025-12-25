require('dotenv').config({ path: 'apps/backend/.env' });
const { Pool } = require('pg');

async function seed() {
    if (!process.env.DATABASE_URL) {
        console.warn('DATABASE_URL missing, using default.');
        process.env.DATABASE_URL = 'postgresql://maple_user:maple_password@localhost:5432/maple_db';
        // Wait, original file said 'steam_user', 'steam_password', 'steam_marketplace'.
        // I should match config/database.js defaults.        
        process.env.DATABASE_URL = 'postgresql://steam_user:steam_password@localhost:5432/steam_marketplace';
    }

    // Create pool
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        console.log('Checking listings schema...');
        // Ensure table exists (it should via migrations, but being safe)

        console.log('Checking listings count...');
        const res = await client.query("SELECT count(*) FROM listings");
        const count = parseInt(res.rows[0].count);

        if (count > 0) {
            console.log(`Database already has ${count} listings. Skipping seed.`);
            return;
        }

        console.log('Seeding listings...');
        // Insert dummy listings
        // We use a fake seller steamId '76561198000000000'
        const sellerId = '76561198000000000';

        const items = [
            { name: 'AWP | Dragon Lore', price: 1500.00, icon: 'http://cdn.steamcommunity.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0nPbmPLTQqWgu5Mx2gv3--Y3nj1h84kI_Y270LdecIQc8YQvTrFm9x-e9g5606Z_MnCRj7yQk7XfVmQv3308XJ_-s1A', app_id: 730 },
            { name: 'Karambit | Fade', price: 900.50, icon: 'http://cdn.steamcommunity.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLacDBA5ciJl5W0nPb4J4Tdn2xZ_Ish0rDA99Wk0QGx_xBvYGj2ctCccQI9ZlqC_VA6x-u618O8vM6bn3J9-n1069Xv85E', app_id: 730 },
            { name: 'Butterfly Knife | Doppler', price: 1200.00, icon: 'http://cdn.steamcommunity.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLacDBA5ciJl5W0nPb4J4Tdn2xZ_Ish0rDA99Wk0QGx_xBvYGj2ctCccQI9ZlqC_VA6x-u618O8vM6bn3J9-n1069Xv85E', app_id: 730 },
            { name: 'Dragonclaw Hook', price: 300.00, icon: 'https://community.akamaihd.net/economy/image/5a974052ca28a883a936652481cb5176af8cc0c8', app_id: 570 },
            { name: 'Manifold Paradox', price: 25.00, icon: 'https://community.akamaihd.net/economy/image/5a974052ca28a883a936652481cb5176af8cc0c8', app_id: 570 }
        ];

        for (const item of items) {
            // Generate dummy asset ID
            const assetId = Math.floor(Math.random() * 1000000000).toString();

            await client.query(`
                INSERT INTO listings 
                (seller_steam_id, item_name, item_market_hash_name, item_icon_url, item_app_id, price, status, created_at, seller_trade_url, item_asset_id)
                VALUES ($1, $2, $2, $3, $4, $5, 'active', NOW(), 'https://steamcommunity.com/tradeoffer/new/?partner=1000&token=dummy', $6)
             `, [sellerId, item.name, item.icon, item.app_id, item.price, assetId]);
        }

        console.log('Seeding complete! Added 5 listings.');

    } catch (e) {
        console.error('Seeding failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
