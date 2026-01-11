/**
 * Manual Bot Inventory Sync Script
 * Runs outside of the API to force a sync of the bot's items to the marketplace.
 */

require('dotenv').config();
const { pool } = require('./apps/backend/src/config/database');
const { botManager } = require('./apps/backend/src/services/bot-manager.service');
const { initializeBots } = require('./apps/backend/src/config/bots.config');

async function sync() {
    console.log('🚀 Starting manual inventory sync...');

    try {
        // 1. Initialize Bots
        console.log('🤖 Initializing bots...');
        await initializeBots();
        
        // Wait a bit for Steam login to complete
        console.log('⏳ Waiting 10s for Steam connection...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        const bot = botManager.getAvailableBot();
        if (!bot) {
            console.error('❌ No bot available. Make sure STEAM_BOT_1_... vars are correct.');
            process.exit(1);
        }

        if (!bot.isReady) {
            console.error('❌ Bot is initialized but not READY (isLoggedIn: false).');
            process.exit(1);
        }

        // 2. Fetch Inventory
        console.log(`📦 Fetching inventory for bot ${bot.config.accountName} (${bot.config.steamId})...`);
        const inventory = await bot.getInventory(730, 2);
        console.log(`✅ Found ${inventory.length} items.`);

        if (inventory.length === 0) {
            console.warn('⚠️ Bot inventory is empty.');
        }

        // 3. Update Database
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Optional: Clean up old bot listings (only for this bot)
            console.log('🧹 Cleaning up old bot listings...');
            await client.query('DELETE FROM listings WHERE seller_steam_id = $1', [bot.config.steamId]);

            let count = 0;
            for (const item of inventory) {
                const price = 10.00; // Default price for now
                
                await client.query(
                    `INSERT INTO listings (
                        seller_steam_id, seller_trade_url, status, 
                        item_asset_id, item_name, item_market_hash_name, 
                        item_app_id, item_icon_url, price
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        bot.config.steamId,
                        'https://steamcommunity.com/tradeoffer/new/?partner=YOUR_BOT_PARTNER_ID&token=YOUR_TOKEN', // Bot trade URL
                        'active',
                        item.assetid,
                        item.market_hash_name || item.name,
                        item.market_hash_name,
                        730,
                        item.icon_url,
                        price
                    ]
                );
                count++;
            }

            await client.query('COMMIT');
            console.log(`🎉 Successfully synced ${count} items to the marketplace!`);
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('💥 Sync failed:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

sync();
