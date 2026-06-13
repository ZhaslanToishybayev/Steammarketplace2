// @ts-check
/**
 * Bot Manager Service (Enhanced)
 * Manages multiple Steam bots with load balancing, health checks and session persistence
 * @module services/bot-manager
 */

const SteamBot = require('./steam-bot.service');
const EventEmitter = require('events');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const { logger } = require('../utils/logger'); // Ensure logger is used
const metrics = require('./metrics.service');
const telegram = require('./telegram-bot.service');
const { sessionService } = require('./bot-session.service');
const { tradeQueueService } = require('./trade-queue.service');
const { recordRemediation, recordBotSelectionScore, recordBotSelection } = require('./metrics.service');

/**
 * Helper: Sleep function
 * @param {number} ms 
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Login a single bot with retry logic and rate limit handling
 * @param {import('./steam-bot.service').BotConfig} botConfig 
 * @param {number} maxRetries 
 * @returns {Promise<SteamBot>}
 */
async function loginBotWithRetry(botConfig, maxRetries = 3) {
    // We need to access the bot instance from the manager's map or create a temp one?
    // Actually, this helper should probably wrap the bot.initialize() call
    // But since SteamBot.initialize handles login logic internally, we need to inject retry there or here.
    // Let's assume this helper is used by BotManager to start bots.
    
    // However, BotManager creates SteamBot instances which do their own thing.
    // To implement the "Exponential Backoff" at the manager level without rewriting SteamBot class entirely:
    // We will create the bot instance, and then call a robust login method.
    
    // For now, let's keep this logic inside startAll() or similar in BotManager.
    return null; 
}

class BotManager extends EventEmitter {
    constructor() {
        super();
        /** @type {Map<string, SteamBot>} */
        this.bots = new Map();
        /** @type {NodeJS.Timeout|null} */
        this.healthCheckInterval = null;
        /** @type {boolean} */
        this.isRunning = false;
        
        // Track bot reconnection state for self-healing
        this.botReconnectState = new Map();

        this.sendTradeOffer = this.sendTradeOffer.bind(this);
        this.getAvailableBot = this.getAvailableBot.bind(this);
        this.getAllBots = this.getAllBots.bind(this);
    }

    /**
     * Add a bot to the manager
     * @param {import('./steam-bot.service').BotConfig} config - Bot configuration
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

        // Increase max listeners
        this.setMaxListeners(Math.max(this.getMaxListeners(), this.bots.size * 6 + 20));

        console.log(`[BotManager] Added bot: ${config.accountName}`);
        return bot;
    }

    /**
     * Start all bots with staggered startup and retry logic
     * Parallel execution with concurrency limit to prevent blocking
     */
    async startAll() {
        console.log(`[BotManager] Starting ${this.bots.size} bots...`);
        const results = [];
        const botsList = Array.from(this.bots.values());
        
        // Split into chunks of 3 to avoid hammering Steam API too hard simultaneously
        const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
        const batches = chunk(botsList, 3);

        for (const batch of batches) {
            console.log(`[BotManager] Starting batch of ${batch.length} bots...`);
            
            // Start batch in parallel, but wait for results
            const batchResults = await Promise.allSettled(batch.map(async (bot) => {
                try {
                    await this._loginWithRetry(bot);
                    return { success: true, bot: bot.config.accountName };
                } catch (err) {
                    console.error(`[BotManager] Failed to start bot ${bot.config.accountName}:`, err.message);
                    return { success: false, bot: bot.config.accountName, error: err.message };
                }
            }));

            batchResults.forEach(res => {
                if (res.status === 'fulfilled') results.push(res.value);
                else results.push({ success: false, error: 'Unknown error' }); // Should not happen with inner try/catch
            });

            // Small delay between batches
            if (batches.indexOf(batch) < batches.length - 1) {
                await sleep(5000);
            }
        }

        const successful = results.filter(r => r.success).length;
        console.log(`[BotManager] Started ${successful}/${this.bots.size} bots`);

        // Start health checks
        this._startHealthChecks();
        this.isRunning = true;

        return results;
    }

    /**
     * Internal: Login a bot with Exponential Backoff
     * @param {SteamBot} bot 
     * @param {number} maxRetries 
     */
    async _loginWithRetry(bot, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[Bot ${bot.config.accountName}] Login attempt ${attempt}/${maxRetries}`);
                
                // Use bot.initialize() which wraps the underlying login
                await bot.initialize();
                
                console.log(`[Bot ${bot.config.accountName}] ✅ Logged in successfully`);
                const stats = this.getStatistics();
                metrics.updateBotMetrics(stats.onlineBots, stats.totalBots);
                return; // Success

            } catch (error) {
                // Check if it is a Rate Limit error
                const isRateLimit = error.message.includes('429') || 
                                    error.message.includes('RateLimitExceeded') ||
                                    (error.eresult === 84); // EResult.RateLimitExceeded

                if (isRateLimit && attempt < maxRetries) {
                    // Exponential backoff: 60s, 120s, 240s
                    const delay = Math.pow(2, attempt) * 60000; 
                    console.warn(`[Bot ${bot.config.accountName}] Rate limited (429). Retrying in ${delay/1000}s...`);
                    await sleep(delay);
                } else if (attempt < maxRetries) {
                    // Generic error - wait shorter time (10s) and retry
                    console.warn(`[Bot ${bot.config.accountName}] Login failed (${error.message}). Retrying in 10s...`);
                    await sleep(10000);
                } else {
                    // Final failure
                    const msg = `Bot ${bot.config.accountName} failed to login after ${maxRetries} attempts. Error: ${error.message}`;
                    console.error(`[BotManager] ❌ ${msg}`);
                    await telegram.sendCriticalError('Bot Login', msg);
                    throw error;
                }
            }
        }
    }

    /**
     * Stop all bots
     */
    stopAll() {
        console.log(`[BotManager] Stopping all bots...`);
        this._stopHealthChecks();
        this.bots.forEach(bot => bot.logout());
        this.isRunning = false;
        console.log(`[BotManager] All bots stopped`);
    }

    /**
     * Get an available bot (smart selection with scoring algorithm)
     * Scores based on: session age (40%), success rate (30%), load (20%), inventory (10%)
     */
    async getAvailableBot() {
        const availableBots = this.getOnlineBots();
        if (availableBots.length === 0) return null;
        
        if (availableBots.length === 1) return availableBots[0];
        
        // Score each bot
        const scoredBots = [];
        for (const bot of availableBots) {
            const score = await this._scoreBot(bot);
            scoredBots.push({ bot, score });
        }
        
        // Sort by score (highest first)
        scoredBots.sort((a, b) => b.score - a.score);
        
        const selected = scoredBots[0];
        console.log(`[BotManager] Smart selection: ${selected.bot.config.accountName} (score: ${selected.score.toFixed(1)})`);
        
        // Record metrics
        recordBotSelectionScore(selected.bot.config.accountName, selected.score);
        recordBotSelection(selected.bot.config.accountName);
        
        return selected.bot;
    }
    
    /**
     * Calculate bot score for smart selection
     */
    async _scoreBot(bot) {
        let score = 100;
        const accountName = bot.config.accountName;
        
        // 1. Session age (40% weight)
        try {
            const sessionAge = await sessionService.getSessionAgeHours(accountName);
            if (sessionAge !== null) {
                if (sessionAge < 2) score += 40;
                else if (sessionAge < 6) score += 30;
                else if (sessionAge < 10) score += 10;
                else score -= 20;
            }
        } catch (err) {
            console.error(`[BotManager] Failed to get session age for ${accountName}:`, err.message);
        }
        
        // 2. Recent success rate (30% weight) - last 10 trades
        const recentTrades = bot.recentTrades || [];
        if (recentTrades.length > 0) {
            const successCount = recentTrades.filter(t => t.success).length;
            const successRate = (successCount / recentTrades.length) * 100;
            score += (successRate - 70) * 0.3;
        }
        
        // 3. Active trades load (20% weight)
        score -= (bot.activeTrades || 0) * 5;
        
        // 4. Inventory balance (10% weight)
        const allBots = this.getAllBots();
        const avgInventory = allBots.reduce((sum, b) => sum + (b.inventoryCount || 0), 0) / allBots.length;
        if (avgInventory > 0) {
            const ratio = (bot.inventoryCount || 0) / avgInventory;
            if (ratio > 1.5) score -= 10;
            else if (ratio < 0.5) score += 10;
        }
        
        return score;
    }

    getBot(accountName) {
        return this.bots.get(accountName) || null;
    }

    getAllBots() {
        return Array.from(this.bots.values());
    }

    getOnlineBots() {
        return this.getAllBots().filter(bot => bot.isReady);
    }

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

    // ... (rest of methods like sendTradeOffer kept mostly same, but can be optimized)
    
    async sendTradeOffer(options) {
        console.log('[BotManager] sendTradeOffer called with:', !!options);
        const bot = await this.getAvailableBot();
        
        if (!bot) {
            console.warn('[BotManager] No bot available, queuing trade for later processing');
            
            // Queue the trade for when a bot becomes available
            const job = await tradeQueueService.addTradeJob({
                type: 'escrow-request-item',
                ...options
            }, { priority: 3 }); // Medium-high priority
            
            console.log(`[BotManager] Trade queued with job ID: ${job.jobId}`);
            
            // Notify that trade is queued
            await telegram.sendMessage(
                `⏳ Trade queued (Job: ${job.jobId}) - No bot available. Will retry automatically when bot comes online.`,
                'info'
            );
            
            return { queued: true, jobId: job.jobId, message: 'Trade queued - no bot available' };
        }
        
        const offerId = await bot.sendTradeOffer(options);
        return { bot, offerId };
    }


    _startHealthChecks() {
        if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = setInterval(() => this._performHealthCheck(), 5 * 60 * 1000);
        console.log(`[BotManager] Health checks started`);
    }

    _stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    async _performHealthCheck() {
        console.log(`[BotManager] Performing health check...`);
        for (const [accountName, bot] of this.bots) {
            if (!bot.isOnline) {
                const state = this.botReconnectState.get(accountName) || { attempts: 0, lastOnline: Date.now() };
                const offlineMinutes = Math.floor((Date.now() - state.lastOnline) / 60000);
                
                console.log(`[BotManager] Bot ${accountName} is offline for ${offlineMinutes}min, attempting reconnect...`);
                
                state.attempts++;
                this.botReconnectState.set(accountName, state);
                
                if (offlineMinutes >= 2 || state.attempts >= 3) {
                    await telegram.sendMessage(
                        `⚠️ Bot **${accountName}** offline for ${offlineMinutes}min (${state.attempts} attempts). ` +
                        `Self-healing: Auto-reconnect in progress...`,
                        'warning'
                    );
                }
                
                const backoffDelay = Math.min(Math.pow(2, state.attempts) * 1000, 30000);
                setTimeout(() => {
                    this._loginWithRetry(bot).then(() => {
                        this.botReconnectState.delete(accountName);
                        recordRemediation('bot_reconnect', 'success');
                        telegram.sendMessage(`✅ Bot **${accountName}** reconnected successfully!`, 'info');
                    }).catch(err => {
                        console.error(`[BotManager] Failed to reconnect ${accountName}:`, err.message);
                        if (state.attempts >= 3) {
                            recordRemediation('bot_reconnect', 'failure');
                            telegram.sendCriticalError('Bot Reconnect', `Bot ${accountName} failed to reconnect after 3 attempts`);
                        }
                    });
                }, backoffDelay);
            }
            
            // Update session age metric and check for predictive alert
            try {
                const sessionAge = await sessionService.getSessionAgeHours(accountName);
                if (sessionAge !== null) {
                    metrics.updateBotSessionAge(accountName, sessionAge);
                    
                    // Predictive alert: session age > 8 hours (will expire in ~4 hours)
                    if (sessionAge > 8 && sessionAge <= 10) {
                        console.warn(`[BotManager] Bot ${accountName} session age ${sessionAge.toFixed(1)}h - will expire soon`);
                        await telegram.sendMessage(
                            `🟡 Predictive Alert: Bot **${accountName}** session age is ${sessionAge.toFixed(1)} hours. Session will expire in ~4 hours.`,
                            'warning'
                        );
                    }
                }
            } catch (err) {
                console.error(`[BotManager] Failed to get session age for ${accountName}:`, err.message);
            }
        }
        const stats = this.getStatistics();
        metrics.updateBotMetrics(stats.onlineBots, stats.totalBots);
        this.emit('healthCheck', stats);
    }

    /**
     * Relogin all bots (used by DLQ remediation for session errors)
     */
    async reloginAllBots() {
        console.log('[BotManager] Relogin all bots initiated by DLQ remediation');
        
        for (const [accountName, bot] of this.bots) {
            try {
                console.log(`[BotManager] Relogin bot ${accountName}...`);
                await bot.logout();
                await this._loginWithRetry(bot);
                console.log(`[BotManager] Bot ${accountName} relogin successful`);
            } catch (err) {
                console.error(`[BotManager] Failed to relogin bot ${accountName}:`, err.message);
            }
        }
        
        console.log('[BotManager] All bots relogin completed');
    }
}

const botManager = new BotManager();
module.exports = { BotManager, botManager };
