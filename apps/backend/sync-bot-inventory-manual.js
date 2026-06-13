/**
 * Manual Bot Inventory Sync Script
 * Runs inside the backend container to force a sync.
 */

require('dotenv').config();
const { pool } = require('./src/config/database');
const { botManager } = require('./src/services/bot-manager.service');
const { initializeBots } = require('./src/config/bots.config');

async function sync() {
    console.log('🚀 Starting manual inventory sync inside container...');

    try {
        // 1. Initialize Bots
        console.log('🤖 Initializing bots...');
        await initializeBots();
        
        // Wait for Steam login
        console.log('⏳ Waiting 15s for Steam connection...');
        await new Promise(resolve => setTimeout(resolve, 15000));

        const bot = botManager.getAvailableBot();
        if (!bot) {
            console.error('❌ No bot available.');
            process.exit(1);
        }

        if (!bot.isReady) {
            console.error('❌ Bot is initialized but not READY.');
            process.exit(1);
        }

        // 2. Fetch Inventory
        console.log(`📦 Fetching inventory for bot ${bot.config.accountName}...`);
        const inventory = await bot.getInventory(730, 2);
        console.log(`✅ Found ${inventory.length} items.`);

        // 3. Update Database
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            console.log('🧹 Cleaning up old bot listings...');
            await client.query('DELETE FROM listings WHERE seller_steam_id = $1', [bot.config.steamId]);

            let count = 0;
            for (const item of inventory) {
                await client.query(
                    `INSERT INTO listings (
                        seller_steam_id, seller_trade_url, status, 
                        item_asset_id, item_name, item_market_hash_name, 
                        item_app_id, item_icon_url, price
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        bot.config.steamId,
                        'https://steamcommunity.com/tradeoffer/new/?partner=YOUR_BOT_PARTNER_ID&token=YOUR_TOKEN',
                        'active',
                        item.assetid,
                        item.market_hash_name || item.name,
                        item.market_hash_name,
                        730,
                        item.icon_url,
                        10.00
                    ]
                );
                count++;
            }
            await client.query('COMMIT');
            console.log(`🎉 Successfully synced ${count} items!`);
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('💥 Sync failed:', err);
    } finally {
        process.exit(0);
    }
}

sync();
