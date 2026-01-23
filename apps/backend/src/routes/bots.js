/**
 * Bots Routes
 * Handles bot status and monitoring
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { botManager } = require('../services/bot-manager.service');

/**
 * GET /api/bots/status
 * Get all bots status
 */
router.get('/status', async (req, res) => {
    try {
        const result = await query(`
            SELECT steam_id, account_name, display_name, status, 
                   inventory_count, active_trades_count, last_online_at, 
                   last_error, created_at
            FROM bots
            ORDER BY created_at ASC
        `);

        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length,
            online: result.rows.filter(b => b.status === 'online').length
        });
    } catch (err) {
        console.error('[Bots] Failed to get status:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch bot status' });
    }
});

/**
 * GET /api/bots/:steamId
 * Get specific bot details
 */
router.get('/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        const result = await query("SELECT * FROM bots WHERE steam_id = $1", [steamId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Bot not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('[Bots] Failed to get bot:', err);
        res.status(500).json({ success: false, error: 'Internal error' });
    }
});

/**
 * GET /api/bots/:steamId/inventory
 * Get bot's CS2 inventory directly from Steam
 */
router.get('/:steamId/inventory', async (req, res) => {
    try {
        const { steamId } = req.params;
        const appId = parseInt(req.query.appId) || 730;

        // Find the bot
        const bots = botManager.getAllBots();
        let targetBot = null;

        for (const bot of bots) {
            if (bot.config.steamId === steamId) {
                targetBot = bot;
                break;
            }
        }

        if (!targetBot) {
            return res.status(404).json({ success: false, error: 'Bot not found or not online' });
        }

        if (!targetBot.isReady) {
            return res.status(503).json({ success: false, error: 'Bot is not ready' });
        }

        console.log(`[Bots] Fetching inventory for bot ${steamId}...`);
        const inventory = await targetBot.getInventory(appId, '2');

        res.json({
            success: true,
            steamId,
            appId,
            count: inventory.length,
            items: inventory.map(item => ({
                assetId: item.assetid,
                classId: item.classid,
                instanceId: item.instanceid,
                name: item.name,
                market_hash_name: item.market_hash_name,
                icon_url: item.icon_url,
                tradable: item.tradable,
                marketable: item.marketable,
                type: item.type,
                tags: item.tags
            }))
        });
    } catch (err) {
        console.error('[Bots] Failed to get inventory:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to fetch inventory' });
    }
});

/**
 * POST /api/bots/:steamId/sync-inventory
 * Sync bot's inventory to marketplace listings
 */
router.post('/:steamId/sync-inventory', async (req, res) => {
    try {
        const { steamId } = req.params;
        const appId = parseInt(req.query.appId) || 730;

        // Find the bot
        const bots = botManager.getAllBots();
        let targetBot = null;

        for (const bot of bots) {
            if (bot.config.steamId === steamId) {
                targetBot = bot;
                break;
            }
        }

        if (!targetBot) {
            return res.status(404).json({ success: false, error: 'Bot not found or not online' });
        }

        if (!targetBot.isReady) {
            return res.status(503).json({ success: false, error: 'Bot is not ready' });
        }

        console.log(`[Bots] Syncing inventory for bot ${steamId}...`);
        const inventory = await targetBot.getInventory(appId, '2');

        // Filter tradable items
        const tradableItems = inventory.filter(item => item.tradable && item.marketable);

        if (tradableItems.length === 0) {
            return res.json({ success: true, message: 'No tradable items found', created: 0 });
        }

        let created = 0;
        let skipped = 0;

        for (const item of tradableItems) {
            // Check if listing already exists
            const existing = await query(
                "SELECT id FROM listings WHERE seller_steam_id = $1 AND item_asset_id = $2 AND status = 'active'",
                [steamId, item.assetid]
            );

            if (existing.rows.length > 0) {
                skipped++;
                continue;
            }

            // Get price from Steam Market (simple estimate)
            let price = 10.00; // Default price
            try {
                const axios = require('axios');
                const priceRes = await axios.get('https://steamcommunity.com/market/priceoverview/', {
                    params: { appid: appId, currency: 1, market_hash_name: item.market_hash_name },
                    timeout: 3000
                });
                if (priceRes.data && priceRes.data.success && priceRes.data.lowest_price) {
                    price = parseFloat(priceRes.data.lowest_price.replace(/[^0-9.]/g, '')) || 10.00;
                }
            } catch (e) {
                console.warn(`[Bots] Could not get price for ${item.market_hash_name}`);
            }

            // Create listing
            await query(`
                INSERT INTO listings 
                (seller_steam_id, item_asset_id, item_name, item_market_hash_name, 
                 item_icon_url, item_app_id, item_rarity, item_exterior, price, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
            `, [
                steamId,
                item.assetid,
                item.name,
                item.market_hash_name,
                item.icon_url,
                appId,
                item.tags?.find(t => t.category === 'Rarity')?.localized_tag_name || 'Unknown',
                item.tags?.find(t => t.category === 'Exterior')?.localized_tag_name || 'Unknown',
                price
            ]);

            created++;

            // Rate limit
            await new Promise(r => setTimeout(r, 200));
        }

        // Update bot inventory count
        await query("UPDATE bots SET inventory_count = $1, updated_at = NOW() WHERE steam_id = $2",
            [tradableItems.length, steamId]);

        console.log(`[Bots] Synced ${created} new listings for bot ${steamId}`);

        res.json({
            success: true,
            message: `Synced inventory successfully`,
            total: tradableItems.length,
            created,
            skipped
        });
    } catch (err) {
        console.error('[Bots] Failed to sync inventory:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to sync inventory' });
    }
});

module.exports = router;

