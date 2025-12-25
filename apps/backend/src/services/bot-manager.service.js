// @ts-check
/**
 * Bot Manager Service (Enhanced)
 * Manages multiple Steam bots with load balancing, health checks and session persistence
 * @module services/bot-manager
 */

const SteamBot = require('./steam-bot.service');
const EventEmitter = require('events');

/**
 * @typedef {Object} BotConfig
 * @property {string} accountName - Steam account username
 * @property {string} password - Steam account password
 * @property {string} sharedSecret - Steam Guard shared secret for 2FA
 * @property {string} identitySecret - Steam Guard identity secret for trade confirmations
 * @property {string} [steamId] - Optional SteamID64
 */

/**
 * @typedef {Object} TradeOfferOptions
 * @property {string} tradeUrl - Recipient's trade URL
 * @property {string} [sellerSteamId] - Seller's SteamID64 (for scam protection)
 * @property {string} [buyerSteamId] - Buyer's SteamID64 (for scam protection)
 * @property {TradeItem[]} [itemsToReceive] - Items to receive from the partner
 * @property {TradeItem[]} [itemsToGive] - Items to give to the partner
 * @property {string} [message] - Trade offer message
 */

/**
 * @typedef {Object} TradeItem
 * @property {string} assetId - Asset ID of the item
 * @property {string} [assetid] - Alternative asset ID property
 * @property {number} [appId] - App ID (e.g., 730 for CS2)
 * @property {string} [contextId] - Context ID
 */

/**
 * @typedef {Object} BotStatistics
 * @property {number} totalBots - Total number of bots
 * @property {number} onlineBots - Number of online bots
 * @property {number} offlineBots - Number of offline bots
 * @property {Object[]} bots - Status of each bot
 */

class BotManager extends EventEmitter {
    constructor() {
        super();
        /** @type {Map<string, SteamBot>} */
        this.bots = new Map();
        /** @type {NodeJS.Timeout|null} */
        this.healthCheckInterval = null;
        /** @type {boolean} */
        this.isRunning = false;
    }

    /**
     * Add a bot to the manager
     * @param {BotConfig} config - Bot configuration
     * @returns {SteamBot} The created bot instance
     */
    addBot(config) {
        const bot = new SteamBot(config);
        this.bots.set(config.accountName, bot);

        // Forward bot events
        bot.on('ready', () => this.emit('botReady', bot));
        bot.on('disconnected', () => this.emit('botDisconnected', bot));
        bot.on('error', (err) => this.emit('botError', { bot, error: err }));
        bot.on('newOffer', (offer) => this.emit('newOffer', { bot, offer }));
        bot.on('sentOfferChanged', (data) => this.emit('sentOfferChanged', { bot, ...data }));
        bot.on('receivedOfferChanged', (data) => this.emit('receivedOfferChanged', { bot, ...data }));

        // Increase max listeners to accommodate multiple bots (6 listeners per bot + base)
        this.setMaxListeners(Math.max(this.getMaxListeners(), this.bots.size * 6 + 20));

        console.log(`[BotManager] Added bot: ${config.accountName}`);
        return bot;
    }

    /**
     * Remove a bot
     * @param {string} accountName - Bot account name to remove
     */
    removeBot(accountName) {
        const bot = this.bots.get(accountName);
        if (bot) {
            bot.logout();
            this.bots.delete(accountName);
            console.log(`[BotManager] Removed bot: ${accountName}`);
        }
    }

    /**
     * Start all bots with queue processing
     */
    async startAll() {
        console.log(`[BotManager] Starting ${this.bots.size} bots...`);

        const promises = Array.from(this.bots.values()).map(async (bot) => {
            try {
                // Use initialize() instead of login() to support session restoration
                const success = await bot.initialize();
                return { success, bot: bot.config.accountName };
            } catch (/** @type {any} */ err) {
                return { success: false, bot: bot.config.accountName, error: err.message };
            }
        });

        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

        console.log(`[BotManager] Started ${successful}/${this.bots.size} bots`);

        // Start health checks
        this._startHealthChecks();
        this.isRunning = true;

        return results;
    }

    /**
     * Stop all bots
     */
    stopAll() {
        console.log(`[BotManager] Stopping all bots...`);

        this._stopHealthChecks();

        this.bots.forEach(bot => {
            bot.logout();
        });

        this.isRunning = false;
        console.log(`[BotManager] All bots stopped`);
    }

    /**
     * Get an available bot (smart load balancing)
     * Prioritizes bots with fewer active trades and sufficient inventory space
     */
    getAvailableBot() {
        let bestBot = null;
        let minLoad = Infinity;

        for (const [, bot] of this.bots) {
            if (bot.isReady && bot.isOnline) {
                // Calculate load score (lower is better)
                // Active trades weight: 1.0 per trade
                // Inventory usage weight: 0.1 per 100 items
                const loadScore = bot.activeTrades + (bot.inventoryCount / 1000);

                // Ensure bot is not full
                if (bot.inventoryCount < 950 && loadScore < minLoad) {
                    minLoad = loadScore;
                    bestBot = bot;
                }
            }
        }

        return bestBot;
    }

    /**
     * Get bot by account name
     * @param {string} accountName - Bot account name
     * @returns {SteamBot|null} Bot instance or null
     */
    getBot(accountName) {
        return this.bots.get(accountName) || null;
    }

    /**
     * Get all bots
     */
    getAllBots() {
        return Array.from(this.bots.values());
    }

    /**
     * Get online bots
     */
    getOnlineBots() {
        return this.getAllBots().filter(bot => bot.isReady);
    }

    /**
     * Get bot statistics
     */
    getStatistics() {
        const all = this.getAllBots();
        const online = this.getOnlineBots();

        return {
            totalBots: all.length,
            onlineBots: online.length,
            offlineBots: all.length - online.length,
            bots: all.map(bot => bot.getStatus()),
        };
    }

    /**
     * Send trade offer using available bot
     * Now includes scam protection pre-flight checks
     * @param {TradeOfferOptions} options - Trade offer options
     * @returns {Promise<{bot: SteamBot, offerId: string}>} Bot and offer ID
     */
    async sendTradeOffer(options) {
        const { sellerSteamId, buyerSteamId, itemsToReceive, itemsToGive } = options;

        // ========== SCAM PROTECTION PRE-FLIGHT ==========
        try {
            const scamProtection = require('./scam-protection.service');

            // Check each item being given (Bot -> User trades)
            if (itemsToGive && itemsToGive.length > 0) {
                // For bot inventory items, we trust our own inventory
                // Skip pre-trade check for bot-owned items
            }

            // Check each item being received (User -> Bot trades / P2P)
            if (itemsToReceive && itemsToReceive.length > 0 && sellerSteamId) {
                for (const item of itemsToReceive) {
                    const preCheck = await scamProtection.preTradeCheck(
                        sellerSteamId,
                        buyerSteamId || 'BOT',
                        item.assetId || item.assetid,
                        item.appId || 730
                    );

                    if (!preCheck.passed) {
                        console.warn(`[BotManager] Trade blocked by ScamProtection: ${preCheck.reason}`);
                        throw new Error(`Trade blocked: ${preCheck.reason}`);
                    }
                }
                console.log(`[BotManager] ScamProtection: All pre-trade checks passed`);
            }
        } catch (/** @type {any} */ scamErr) {
            if (scamErr.message.startsWith('Trade blocked:')) {
                throw scamErr; // Re-throw blocking errors
            }
            // Log but don't block on service errors (fail-open for availability)
            console.warn(`[BotManager] ScamProtection check failed (proceeding): ${scamErr.message}`);
        }
        // ========== END SCAM PROTECTION ==========

        const bot = this.getAvailableBot();

        if (!bot) {
            throw new Error('No available bots with capacity');
        }

        const offerId = await bot.sendTradeOffer(options);
        return { bot, offerId };
    }

    /**
     * Start health check interval
     */
    _startHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        // Check bot health every 5 minutes (reduced frequency due to connection persistence)
        this.healthCheckInterval = setInterval(() => {
            this._performHealthCheck();
        }, 5 * 60 * 1000);

        console.log(`[BotManager] Health checks started`);
    }

    /**
     * Stop health check interval
     */
    _stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    /**
     * Perform health check - try to reconnect disconnected bots
     */
    async _performHealthCheck() {
        console.log(`[BotManager] Performing health check...`);

        for (const [accountName, bot] of this.bots) {
            if (!bot.isOnline) {
                console.log(`[BotManager] Bot ${accountName} is offline, ensuring session state...`);
                // The bot's own session handling (SteamBot class) should handle re-logins
                // We trigger initialize() again to be safe if it's completely down
                try {
                    await bot.initialize();
                } catch (/** @type {any} */ err) {
                    console.error(`[BotManager] Failed to health-check ${accountName}:`, err.message);
                }
            }
        }

        this.emit('healthCheck', this.getStatistics());
    }
}

// Singleton instance
const botManager = new BotManager();

module.exports = {
    BotManager,
    botManager,
};
