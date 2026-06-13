/**
 * Advanced Trade Queue Service
 * Priority queue with retry logic and webhooks
 */

const Queue = require('bull');
const Redis = require('ioredis');
const { botPool } = require('./bot-pool.service');

// Queue configuration
const QUEUE_NAME = 'trade-queue-v2';
const RETRY_DELAYS = [1000, 5000, 15000, 30000, 60000]; // Exponential backoff

class AdvancedTradeQueueService {
    constructor() {
        this.queue = null;
        this.redis = null;
        this.webhooks = new Map(); // tradeId -> webhookUrl
        this.init();
    }

    init() {
        try {
            this.redis = new Redis({
                host: process.env.REDIS_HOST || 'redis',
                family: 4,
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
            });

            this.queue = new Queue(QUEUE_NAME, {
                redis: {
                    host: process.env.REDIS_HOST || 'redis',
                family: 4,
                    port: process.env.REDIS_PORT || 6379,
                    password: process.env.REDIS_PASSWORD,
                }
            });

            // Set up queue processors
            this.setupProcessors();

            // Set up event handlers
            this.setupEventHandlers();

            console.log('Advanced trade queue initialized');
        } catch (e) {
            console.error('Failed to initialize trade queue:', e);
        }
    }

    setupProcessors() {
        // Process single trades
        this.queue.process('single', async (job) => {
            return this.processTrade(job.data);
        });

        // Process batch trades (multi-item)
        this.queue.process('batch', async (job) => {
            return this.processBatchTrade(job.data);
        });
    }

    setupEventHandlers() {
        this.queue.on('completed', async (job, result) => {
            console.log(`Trade ${job.id} completed:`, result);
            await this.triggerWebhook(job.data.tradeId, 'completed', result);
        });

        this.queue.on('failed', async (job, err) => {
            console.error(`Trade ${job.id} failed:`, err.message);
            await this.triggerWebhook(job.data.tradeId, 'failed', { error: err.message });
        });

        this.queue.on('stalled', (job) => {
            console.warn(`Trade ${job.id} stalled`);
        });
    }

    // Add single trade to queue
    async addTrade(tradeData, options = {}) {
        const {
            priority = 5, // 1-10, lower = higher priority
            delay = 0,
            webhookUrl = null,
            userId = null
        } = options;

        // Calculate priority (VIP users get priority 1-3)
        let effectivePriority = priority;
        if (userId) {
            const isVip = await this.checkVipStatus(userId);
            if (isVip) {
                effectivePriority = Math.min(priority, 3);
            }
        }

        const job = await this.queue.add('single', tradeData, {
            priority: effectivePriority,
            delay,
            attempts: RETRY_DELAYS.length,
            backoff: {
                type: 'custom',
            },
            removeOnComplete: 100, // Keep last 100
            removeOnFail: 100,
        });

        // Register webhook
        if (webhookUrl) {
            this.webhooks.set(tradeData.tradeId, webhookUrl);
        }

        return {
            jobId: job.id,
            position: await this.getQueuePosition(job.id),
            estimatedWait: await this.estimateWaitTime(effectivePriority)
        };
    }

    // Add batch trade (multiple items)
    async addBatchTrade(items, buyerSteamId, options = {}) {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const tradeData = {
            batchId,
            items,
            buyerSteamId,
            totalPrice: items.reduce((sum, i) => sum + parseFloat(i.price || 0), 0),
            createdAt: Date.now()
        };

        const job = await this.queue.add('batch', tradeData, {
            priority: options.priority || 3, // Batch trades get higher priority
            attempts: RETRY_DELAYS.length,
            backoff: { type: 'custom' },
            removeOnComplete: 50,
            removeOnFail: 50,
        });

        if (options.webhookUrl) {
            this.webhooks.set(batchId, options.webhookUrl);
        }

        return {
            batchId,
            jobId: job.id,
            itemCount: items.length,
            totalPrice: tradeData.totalPrice
        };
    }

    // Process single trade
    async processTrade(tradeData) {
        const { tradeId, sellerSteamId, buyerSteamId, items } = tradeData;

        // Get best available bot
        const bot = botPool.getBestBot({ requireOnline: true });
        if (!bot) {
            throw new Error('No available bots');
        }

        botPool.incrementActiveTrades(bot.id);

        try {
            // Send trade offer via bot
            const result = await this.sendTradeOffer(bot, tradeData);
            botPool.recordTradeComplete(bot.id, true);
            return result;
        } catch (e) {
            botPool.recordTradeComplete(bot.id, false);
            throw e;
        }
    }

    // Process batch trade
    async processBatchTrade(batchData) {
        const { batchId, items, buyerSteamId } = batchData;

        // Group items by seller
        const itemsBySeller = {};
        for (const item of items) {
            const sellerId = item.sellerSteamId;
            if (!itemsBySeller[sellerId]) {
                itemsBySeller[sellerId] = [];
            }
            itemsBySeller[sellerId].push(item);
        }

        // Process each seller's items
        const results = [];
        for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
            // Get best bot
            const bot = botPool.getBestBot({ requireOnline: true });
            if (!bot) {
                results.push({ sellerId, success: false, error: 'No available bots' });
                continue;
            }

            botPool.incrementActiveTrades(bot.id);

            try {
                const result = await this.sendBatchTradeOffer(bot, {
                    buyerSteamId,
                    sellerSteamId: sellerId,
                    items: sellerItems
                });
                botPool.recordTradeComplete(bot.id, true);
                results.push({ sellerId, success: true, ...result });
            } catch (e) {
                botPool.recordTradeComplete(bot.id, false);
                results.push({ sellerId, success: false, error: e.message });
            }
        }

        return { batchId, results };
    }

    // Send trade offer (placeholder - actual implementation in steam-bot.service)
    async sendTradeOffer(bot, tradeData) {
        // This would call the actual bot service
        // Example: return await bot.instance.sendTradeOffer(tradeData);
        return { tradeOfferId: `sim_${Date.now()}`, status: 'sent' };
    }

    // Send batch trade offer
    async sendBatchTradeOffer(bot, tradeData) {
        // This would send multiple items in one offer
        return { tradeOfferId: `batch_${Date.now()}`, itemCount: tradeData.items.length };
    }

    // Check VIP status
    async checkVipStatus(userId) {
        // Check if user has VIP/premium status
        // This would query database
        return false;
    }

    // Trigger webhook
    async triggerWebhook(tradeId, status, data) {
        const webhookUrl = this.webhooks.get(tradeId);
        if (!webhookUrl) return;

        try {
            const axios = require('axios');
            await axios.post(webhookUrl, {
                tradeId,
                status,
                data,
                timestamp: Date.now()
            }, { timeout: 5000 });

            console.log(`Webhook triggered for trade ${tradeId}: ${status}`);
        } catch (e) {
            console.error(`Webhook failed for trade ${tradeId}:`, e.message);
        }
    }

    // Get queue position
    async getQueuePosition(jobId) {
        const waiting = await this.queue.getWaiting();
        const index = waiting.findIndex(j => j.id === jobId);
        return index + 1;
    }

    // Estimate wait time based on priority
    async estimateWaitTime(priority) {
        const stats = await this.queue.getJobCounts();
        const avgProcessTime = 30000; // 30 seconds average
        const jobsAhead = stats.waiting;

        // Higher priority jobs process faster
        const priorityMultiplier = priority <= 3 ? 0.5 : priority <= 5 ? 1 : 1.5;

        return Math.round(jobsAhead * avgProcessTime * priorityMultiplier / 1000); // seconds
    }

    // Get queue stats
    async getStats() {
        const counts = await this.queue.getJobCounts();
        const poolStats = botPool.getPoolStats();

        return {
            queue: counts,
            bots: poolStats,
            throughput: await this.calculateThroughput()
        };
    }

    // Calculate throughput
    async calculateThroughput() {
        const completed = await this.queue.getCompleted(0, 100);
        if (completed.length < 2) return 0;

        const times = completed.map(j => j.finishedOn).sort((a, b) => b - a);
        const timeSpan = times[0] - times[times.length - 1];

        if (timeSpan === 0) return 0;
        return Math.round((completed.length / timeSpan) * 60000); // per minute
    }

    // Pause queue
    async pause() {
        await this.queue.pause();
    }

    // Resume queue
    async resume() {
        await this.queue.resume();
    }

    // Clean old jobs
    async clean(grace = 3600000) {
        await this.queue.clean(grace, 'completed');
        await this.queue.clean(grace, 'failed');
    }
}

// Singleton
const advancedTradeQueue = new AdvancedTradeQueueService();

module.exports = {
    AdvancedTradeQueueService,
    advancedTradeQueue
};
