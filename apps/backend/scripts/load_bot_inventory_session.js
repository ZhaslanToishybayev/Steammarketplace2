/**
 * Load Bot Inventory via Bot Session
 * Uses authenticated bot session to fetch its own inventory.
 * 
 * Usage: node scripts/load_bot_inventory_session.js
 */

require('dotenv').config();

const { query, pool, testConnection } = require('../src/config/database');
const { initializeBots, BOT_CONFIGS } = require('../src/config/bots.config');
const { botManager } = require('../src/services/bot-manager.service');
const { testRedisConnection } = require('../src/config/redis');

async function loadInventoryViaSession() {
    console.log('🚀 Starting Bot Inventory Load (via Session)...\n');

    // Test connections
    await testRedisConnection();
    await testConnection();

    // Initialize bots
    console.log('🤖 Initializing bots...');
    const result = await initializeBots();

    if (!result.success) {
        console.error('❌ Failed to initialize bots');
        await pool.end();
        return;
    }

    // Wait for bot to be ready
    console.log('⏳ Waiting for bot to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const bot = botManager.getAvailableBot();

    if (!bot) {
        console.error('❌ No available bot found');
        await pool.end();
        return;
    }

    console.log(`✅ Using bot: ${bot.config.accountName}`);

    const botSteamId = bot.config.steamId || bot.community?.steamID?.getSteamID64();
    const tradeUrl = `https://steamcommunity.com/tradeoffer/new/?partner=${botSteamId ? (BigInt(botSteamId) - BigInt('76561197960265728')).toString() : 'unknown'}`;

    console.log(`📦 Bot SteamID: ${botSteamId}`);
    console.log(`🔗 Trade URL: ${tradeUrl}\n`);

    // Fetch inventory via bot's TradeOfferManager
    console.log('📦 Fetching bot inventory (CS2 - AppID 730)...');

    try {
        const inventory = await bot.getInventory(730, '2');

        if (!inventory || inventory.length === 0) {
            console.log('⚠️ Bot inventory is empty or could not be fetched');
            await pool.end();
            return;
        }

        console.log(`✅ Found ${inventory.length} items in bot inventory\n`);

        // Process and insert items
        let created = 0;
        let failed = 0;

        for (const item of inventory) {
            try {
                const exterior = extractExterior(item.market_hash_name || item.name);
                const rarity = item.tags?.find(t => t.category === 'Rarity')?.localized_tag_name || null;
                const price = getEstimatedPrice(item.market_hash_name || item.name);

                await query(`
                    INSERT INTO listings (
                        seller_steam_id, seller_trade_url, item_asset_id, item_class_id, item_instance_id,
                        item_name, item_market_hash_name, item_app_id, item_context_id, item_icon_url,
                        item_rarity, item_exterior, price, status, listing_type
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', 'bot_sale')
                    ON CONFLICT DO NOTHING
                `, [
                    botSteamId,
                    tradeUrl,
                    item.assetid,
                    item.classid,
                    item.instanceid,
                    item.name,
                    item.market_hash_name || item.name,
                    730,
                    '2',
                    item.icon_url ? `https://community.cloudflare.steamstatic.com/economy/image/${item.icon_url}` : null,
                    rarity,
                    exterior,
                    price.toFixed(2),
                ]);

                created++;
                console.log(`  ✅ ${item.name} - $${price.toFixed(2)}`);

            } catch (err) {
                failed++;
                console.error(`  ❌ ${item.name}: ${err.message}`);
            }
        }

        console.log(`\n🎉 Done! Created ${created} listings, ${failed} failed.`);

        // Show total
        const count = await query(`SELECT COUNT(*) FROM listings WHERE status = 'active'`);
        console.log(`📊 Total active listings: ${count.rows[0].count}`);

    } catch (err) {
        console.error('❌ Failed to fetch inventory:', err.message);
    }

    await pool.end();
    process.exit(0);
}

function extractExterior(name) {
    if (name.includes('Factory New')) return 'Factory New';
    if (name.includes('Minimal Wear')) return 'Minimal Wear';
    if (name.includes('Field-Tested')) return 'Field-Tested';
    if (name.includes('Well-Worn')) return 'Well-Worn';
    if (name.includes('Battle-Scarred')) return 'Battle-Scarred';
    return null;
}

function getEstimatedPrice(name) {
    const base = 2.50;

    // High-value items
    if (name.includes('Dragon Lore')) return 5000 + Math.random() * 2000;
    if (name.includes('Howl')) return 2000 + Math.random() * 500;
    if (name.includes('Fade') && (name.includes('Karambit') || name.includes('Butterfly'))) return 800 + Math.random() * 400;
    if (name.includes('Doppler')) return 200 + Math.random() * 150;
    if (name.includes('Marble Fade')) return 400 + Math.random() * 200;
    if (name.includes('Tiger Tooth')) return 200 + Math.random() * 100;

    // Knives
    if (name.includes('Karambit') || name.includes('Butterfly') || name.includes('M9 Bayonet')) return 150 + Math.random() * 100;
    if (name.includes('Bayonet') || name.includes('Flip') || name.includes('Huntsman')) return 80 + Math.random() * 50;

    // Popular skins
    if (name.includes('Asiimov')) return 25 + Math.random() * 15;
    if (name.includes('Redline')) return 8 + Math.random() * 7;
    if (name.includes('Hyper Beast')) return 15 + Math.random() * 10;
    if (name.includes('Vulcan')) return 20 + Math.random() * 15;
    if (name.includes('Cyrex')) return 10 + Math.random() * 5;

    // By condition
    if (name.includes('Factory New')) return base * 3 + Math.random() * 10;
    if (name.includes('Minimal Wear')) return base * 2 + Math.random() * 5;
    if (name.includes('Field-Tested')) return base * 1.5 + Math.random() * 3;

    return base + Math.random() * 5;
}

loadInventoryViaSession().catch(console.error);
