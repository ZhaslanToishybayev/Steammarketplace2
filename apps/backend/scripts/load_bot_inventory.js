/**
 * Load Bot Inventory to Marketplace
 * Fetches real items from Steam bot inventory and creates marketplace listings.
 * 
 * Usage: node scripts/load_bot_inventory.js
 */

require('dotenv').config();

const { query, pool } = require('../src/config/database');
const { botManager } = require('../src/services/bot-manager.service');
const { initializeBots } = require('../src/config/bots.config');

const STEAM_API_KEY = process.env.STEAM_API_KEY;

async function fetchBotInventoryFromSteam(steamId, appId = 730) {
    const axios = require('axios');

    try {
        // Use Steam Community API to get inventory
        const url = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=500`;
        console.log(`📦 Fetching inventory from: ${url}`);

        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            },
        });

        if (!response.data || !response.data.assets) {
            console.log('⚠️ No assets found in inventory');
            return [];
        }

        const assets = response.data.assets || [];
        const descriptions = response.data.descriptions || [];

        // Map descriptions by classid + instanceid
        const descMap = new Map();
        descriptions.forEach(desc => {
            const key = `${desc.classid}_${desc.instanceid}`;
            descMap.set(key, desc);
        });

        // Combine assets with descriptions
        const items = assets.map(asset => {
            const key = `${asset.classid}_${asset.instanceid}`;
            const desc = descMap.get(key) || {};

            return {
                assetId: asset.assetid,
                classId: asset.classid,
                instanceId: asset.instanceid,
                appId: parseInt(asset.appid),
                contextId: asset.contextid,
                amount: asset.amount,
                name: desc.name || 'Unknown Item',
                marketHashName: desc.market_hash_name || desc.name,
                iconUrl: desc.icon_url ? `https://community.cloudflare.steamstatic.com/economy/image/${desc.icon_url}` : null,
                tradable: desc.tradable === 1,
                marketable: desc.marketable === 1,
                tags: desc.tags || [],
            };
        });

        // Filter only tradable items
        const tradableItems = items.filter(item => item.tradable);
        console.log(`✅ Found ${tradableItems.length} tradable items (${items.length} total)`);

        return tradableItems;

    } catch (err) {
        if (err.response?.status === 403) {
            console.error('❌ Steam API returned 403 Forbidden - inventory may be private or rate limited');
        } else if (err.response?.status === 429) {
            console.error('❌ Steam API rate limit exceeded');
        } else {
            console.error('❌ Failed to fetch inventory:', err.message);
        }
        return [];
    }
}

function extractItemDetails(item) {
    let exterior = null;
    let rarity = null;
    let type = null;

    // Extract info from tags
    item.tags?.forEach(tag => {
        if (tag.category === 'Exterior') {
            exterior = tag.localized_tag_name;
        }
        if (tag.category === 'Rarity') {
            rarity = tag.localized_tag_name;
        }
        if (tag.category === 'Type') {
            type = tag.localized_tag_name;
        }
    });

    return { exterior, rarity, type };
}

async function getPriceEstimate(marketHashName) {
    // Simple price estimation based on rarity
    // In production, you'd call Steam Market API or CSGOFloat
    const basePrice = 5.00;

    if (marketHashName.includes('Dragon Lore')) return 5000 + Math.random() * 2000;
    if (marketHashName.includes('Howl')) return 2000 + Math.random() * 500;
    if (marketHashName.includes('Fade')) return 500 + Math.random() * 300;
    if (marketHashName.includes('Doppler')) return 300 + Math.random() * 200;
    if (marketHashName.includes('Karambit') || marketHashName.includes('Butterfly')) return 400 + Math.random() * 300;
    if (marketHashName.includes('Asiimov')) return 30 + Math.random() * 20;
    if (marketHashName.includes('Redline')) return 10 + Math.random() * 10;
    if (marketHashName.includes('Covert')) return 50 + Math.random() * 50;

    return basePrice + Math.random() * 20;
}

async function loadInventoryToMarketplace() {
    console.log('🚀 Starting Bot Inventory Load...\n');

    // Get bot SteamID
    const botConfig = require('../src/config/bots.config');
    const bots = botConfig.BOT_CONFIGS;

    if (bots.length === 0) {
        console.error('❌ No bots configured!');
        return;
    }

    // We need to get the bot's Steam ID
    // First, check if we have it in the config or need to look it up
    let botSteamId = bots[0].steamId;
    const botUsername = bots[0].accountName;
    const tradeUrl = `https://steamcommunity.com/tradeoffer/new/?partner=${botSteamId ? parseInt(botSteamId.slice(-10)) : 'unknown'}`;

    if (!botSteamId) {
        console.log('⚠️ Bot SteamID not configured. Attempting to resolve...');
        // Try to resolve via Steam API
        try {
            const axios = require('axios');
            const res = await axios.get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${botUsername}`);
            if (res.data?.response?.steamid) {
                botSteamId = res.data.response.steamid;
                console.log(`✅ Resolved SteamID: ${botSteamId}`);
            }
        } catch (err) {
            console.error('❌ Could not resolve SteamID:', err.message);
        }
    }

    if (!botSteamId) {
        console.error('❌ No SteamID available for bot. Please add STEAM_BOT_1_STEAM_ID to .env');
        await pool.end();
        return;
    }

    console.log(`📦 Loading inventory for bot: ${botUsername} (${botSteamId})\n`);

    // Fetch inventory from Steam
    const items = await fetchBotInventoryFromSteam(botSteamId, 730); // CS2

    if (items.length === 0) {
        console.log('⚠️ No tradable items found in bot inventory.');
        await pool.end();
        return;
    }

    // Insert items as listings
    console.log(`\n📝 Creating ${items.length} marketplace listings...\n`);

    let created = 0;
    let failed = 0;

    for (const item of items) {
        try {
            const { exterior, rarity, type } = extractItemDetails(item);
            const price = await getPriceEstimate(item.marketHashName);

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
                item.assetId,
                item.classId,
                item.instanceId,
                item.name,
                item.marketHashName,
                item.appId,
                item.contextId,
                item.iconUrl,
                rarity,
                exterior,
                price.toFixed(2),
            ]);

            created++;
            console.log(`  ✅ ${item.name} - $${price.toFixed(2)}`);

        } catch (err) {
            failed++;
            console.error(`  ❌ Failed to add ${item.name}:`, err.message);
        }
    }

    console.log(`\n🎉 Done! Created ${created} listings, ${failed} failed.`);

    // Verify
    const count = await query(`SELECT COUNT(*) FROM listings WHERE status = 'active'`);
    console.log(`📊 Total active listings in marketplace: ${count.rows[0].count}`);

    await pool.end();
}

// Run
loadInventoryToMarketplace().catch(console.error);
