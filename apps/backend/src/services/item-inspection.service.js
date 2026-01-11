/**
 * Item Inspection Service
 * Fetches float values, paint seeds, and sticker info from CSGOFloat API
 */

const axios = require('axios');
const NodeCache = require('node-cache');

class ItemInspectionService {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 3600 * 24 }); // Cache for 24 hours (static data)
        this.apiUrl = 'https://api.csgofloat.com';
    }

    /**
     * Inspect an item given its inspect link
     * @param {string} inspectLink - steam://rungame/730/...
     */
    async inspectItem(inspectLink) {
        if (!inspectLink) return null;

        // Check cache first
        const cached = this.cache.get(inspectLink);
        if (cached) {
            return cached;
        }

        try {
            // CSGOFloat API (public tier has rate limits)
            const response = await axios.get(this.apiUrl, {
                params: { url: inspectLink },
                timeout: 5000,
            });

            const data = response.data;
            if (!data || !data.iteminfo) {
                return null;
            }

            const info = data.iteminfo;

            const result = {
                floatvalue: info.floatvalue,
                paintindex: info.paintindex,
                paintseed: info.paintseed,
                stickers: info.stickers || [],
                defindex: info.defindex,
                origin: info.origin,
                quality: info.quality,
                rarity: info.rarity,
                phase: this.getDopplerPhase(info.paintindex),
                inspectLink: inspectLink,
                imageurl: info.imageurl, // CSGOFloat generated image
                screenshot_link: `https://csgo.gallery/${inspectLink}` // Fallback/Alternative
            };

            // Cache the result
            this.cache.set(inspectLink, result);

            return result;
        } catch (err) {
            console.warn(`[Inspection] Failed to inspect item: ${err.message}`);
            // Return null rather than throwing to avoid breaking the flow
            return null;
        }
    }

    /**
     * Detect Doppler Phase based on paint index
     * Note: This is a simplified mapping and might need comprehensive data for all knives
     */
    getDopplerPhase(paintIndex) {
        const phases = {
            415: 'Ruby',
            416: 'Sapphire',
            417: 'Black Pearl',
            418: 'Phase 1',
            419: 'Phase 2',
            420: 'Phase 3',
            421: 'Phase 4',
            569: 'Phase 1', // Gamma Doppler
            570: 'Phase 2',
            571: 'Phase 3',
            572: 'Phase 4',
            568: 'Emerald',
        };

        return phases[paintIndex] || null;
    }

    /**
     * Verify that a specific item exists in user's inventory
     * @param {string} steamId - User's Steam ID
     * @param {string} assetId - Item's asset ID
     * @param {object} botManager - Bot manager instance for inventory fetching
     */
    async verifyItemOwnership(steamId, assetId, botManager) {
        if (!steamId || !assetId) {
            return { verified: false, error: 'steamId and assetId are required' };
        }

        try {
            const bot = botManager.getAvailableBot();
            if (!bot) {
                return { verified: false, error: 'No bots available for verification' };
            }

            const inventory = await bot.getInventory(steamId, 730);
            const item = inventory.find(i => i.assetid === assetId || i.id === assetId);

            if (!item) {
                return { verified: false, error: 'Item not found in inventory' };
            }

            if (!item.tradable) {
                return { verified: false, error: 'Item is not tradable', tradeLockDays: item.cache_expiration };
            }

            return {
                verified: true,
                item: {
                    assetId: item.assetid || item.id,
                    name: item.name || item.market_name,
                    marketHashName: item.market_hash_name,
                    iconUrl: item.icon_url,
                    tradable: item.tradable,
                    exterior: item.tags?.find(t => t.category === 'Exterior')?.localized_tag_name,
                    rarity: item.tags?.find(t => t.category === 'Rarity')?.localized_tag_name,
                }
            };
        } catch (err) {
            console.error('[Inspection] Ownership verification failed:', err.message);
            return { verified: false, error: err.message };
        }
    }

    /**
     * Get float value for an item via CS.Float API
     * @param {string} inspectLink - The inspect link
     */
    async getFloatValue(inspectLink) {
        const result = await this.inspectItem(inspectLink);
        if (!result) {
            return null;
        }
        return {
            floatValue: result.floatvalue,
            paintSeed: result.paintseed,
            paintIndex: result.paintindex,
            phase: result.phase,
            stickers: result.stickers
        };
    }
}

// Singleton
const itemInspectionService = new ItemInspectionService();

module.exports = {
    ItemInspectionService,
    itemInspectionService
};
