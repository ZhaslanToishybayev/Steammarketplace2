const { Pool } = require('pg');
const pool = new Pool({
    user: 'steam_user',
    host: 'localhost',
    database: 'steam_marketplace',
    password: 'steam_password',
    port: 5432,
});

const BOT_STEAM_ID = '76561199736802319';
const BOT_TRADE_URL = 'https://steamcommunity.com/tradeoffer/new/?partner=1806536591&token=TEST';

const items = [
    {
        name: 'Souvenir FAMAS | CaliCamo (Field-Tested)',
        market_hash_name: 'Souvenir FAMAS | CaliCamo (Field-Tested)',
        assetId: '48139388426',
        price: 3.50,
        icon_url: 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL3n5vh7h1T9s24abZkI_GeAViUxP1zovVWQiy3nAgq_W_dwt6gdnnGbQJzCsAiFrYCuxDpxt3gN--x7gDfiYpAnyj3inkf6ih1o7FVD3DBfFQ'
    },
    {
        name: 'Desert Eagle | Mudder (Field-Tested)',
        market_hash_name: 'Desert Eagle | Mudder (Field-Tested)',
        assetId: '48139326621',
        price: 0.85,
        icon_url: 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL1m5fn8Sdk5-uRZat5NPyWCliDwOByj-xsSyCmmFMm5GnWnNb_dX_CbVUpXsF5QeRe4BLtkdC2Yb-x5ADa2YoRz374i3tO8G81tNLFY8wl'
    },
    {
        name: 'AUG | Sweeper (Battle-Scarred)',
        market_hash_name: 'AUG | Sweeper (Battle-Scarred)',
        assetId: '47116182310',
        price: 0.25,
        icon_url: 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwi5Hf7jJk4ve9YJt-IfaWGn6Sze91u95hSiiljFMjsTyEmdv8ci7GO1IoWcN5TOMI4BnpkoXhY7nn5AbYj9hExS6rhytA8G81tMQir8wa'
    }
];

async function seed() {
    try {
        console.log('Clearing old listings...');
        await pool.query('DELETE FROM listings');

        for (const item of items) {
            console.log(`Listing ${item.name}...`);
            await pool.query(`
                INSERT INTO listings (
                    seller_steam_id, seller_trade_url, item_asset_id, item_name, 
                    item_market_hash_name, item_app_id, item_icon_url, 
                    price, currency, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'USD', 'active', NOW())
            `, [
                BOT_STEAM_ID,
                BOT_TRADE_URL,
                item.assetId,
                item.name,
                item.market_hash_name,
                730,
                item.icon_url,
                item.price
            ]);
        }
        console.log('✅ Done! 3 Real items listed from Bot inventory.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

seed();
