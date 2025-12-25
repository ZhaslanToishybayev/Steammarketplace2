// @ts-check
/**
 * Trade Queue Service
 * Bull queue for managing trade operations with priorities and retries
 * @module services/trade-queue
 */

const Bull = require('bull');
const { v4: uuidv4 } = require('uuid');

/**
 * @typedef {Object} TradeJobData
 * @property {string} type - Job type (e.g., 'send-offer')
 * @property {string} tradeUrl - Recipient's trade URL
 * @property {string} [tradeUuid] - Trade UUID for tracking
 * @property {Object[]} [itemsToReceive] - Items to receive
 * @property {Object[]} [itemsToGive] - Items to give
 * @property {string} [message] - Trade offer message
 */

/**
 * @typedef {Object} AddJobOptions
 * @property {number} [priority] - Job priority (1 = highest, 10 = lowest)
 * @property {number} [delay] - Delay in ms before job is processed
 */

/**
 * @typedef {Object} QueueStats
 * @property {Object} trade - Trade queue stats
 * @property {number} trade.waiting - Waiting jobs
 * @property {number} trade.active - Active jobs
 * @property {number} trade.completed - Completed jobs
 * @property {number} trade.failed - Failed jobs
 * @property {Object} instant - Instant queue stats
 * @property {number} instant.waiting - Waiting jobs
 * @property {number} instant.active - Active jobs
 */

class TradeQueueService {
    /**
     * @param {string} [redisUrl] - Redis connection URL
     */
    constructor(redisUrl) {
        /** @type {string} */
        this.redisUrl = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

        // Trade offer queue with rate limiting
        /** @type {Bull.Queue} */
        this.tradeQueue = new Bull('trade-offers', this.redisUrl, {
            limiter: {
                max: 25,        // Max 25 jobs per duration
                duration: 60000, // Per minute (Steam allows ~30/min, we use 25 for safety)
            },
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000, // Start with 5s, then 10s, 20s
                },
                removeOnComplete: 100, // Keep last 100 completed jobs
                removeOnFail: 50,
            },
        });

        // Instant sell queue (higher priority)
        /** @type {Bull.Queue} */
        this.instantQueue = new Bull('instant-trades', this.redisUrl, {
            defaultJobOptions: {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 3000,
                },
                removeOnComplete: 50,
            },
        });

        // Price update queue
        /** @type {Bull.Queue} */
        this.priceQueue = new Bull('price-updates', this.redisUrl, {
            defaultJobOptions: {
                attempts: 2,
                removeOnComplete: true,
            },
        });

        this._setupEventHandlers();
    }

    /**
     * Add trade offer job to queue
     */
    async addTradeJob(data, options = {}) {
        const jobId = uuidv4();

        const job = await this.tradeQueue.add('send-offer', {
            jobId,
            ...data,
            createdAt: Date.now(),
        }, {
            priority: options.priority || 5, // 1 = highest, 10 = lowest
            delay: options.delay || 0,
            jobId,
        });

        console.log(`[Queue] Added trade job ${jobId} with priority ${options.priority || 5}`);
        return { jobId, job };
    }

    /**
     * Add instant sell job (high priority)
     */
    async addInstantSellJob(data) {
        const jobId = uuidv4();

        const job = await this.instantQueue.add('instant-sell', {
            jobId,
            ...data,
            createdAt: Date.now(),
        }, {
            priority: 1, // Highest priority
            jobId,
        });

        console.log(`[Queue] Added instant sell job ${jobId}`);
        return { jobId, job };
    }

    /**
     * Add instant buy job (high priority)
     */
    async addInstantBuyJob(data) {
        const jobId = uuidv4();

        const job = await this.instantQueue.add('instant-buy', {
            jobId,
            ...data,
            createdAt: Date.now(),
        }, {
            priority: 1,
            jobId,
        });

        console.log(`[Queue] Added instant buy job ${jobId}`);
        return { jobId, job };
    }

    /**
     * Add price update job
     */
    async addPriceUpdateJob(items) {
        const job = await this.priceQueue.add('update-prices', {
            items,
            createdAt: Date.now(),
        });

        return job;
    }

    /**
     * Set processor for trade queue
     */
    processTradeQueue(concurrency, processor) {
        this.tradeQueue.process('send-offer', concurrency, processor);
    }

    /**
     * Set processor for instant queue
     */
    processInstantQueue(concurrency, processor) {
        this.instantQueue.process('instant-sell', concurrency, processor);
        this.instantQueue.process('instant-buy', concurrency, processor);
    }

    /**
     * Set processor for price queue
     */
    processPriceQueue(concurrency, processor) {
        this.priceQueue.process('update-prices', concurrency, processor);
    }

    /**
     * Get job status
     */
    async getJobStatus(jobId, queueName = 'trade-offers') {
        const queue = queueName === 'instant' ? this.instantQueue : this.tradeQueue;
        const job = await queue.getJob(jobId);

        if (!job) {
            return null;
        }

        const state = await job.getState();
        const progress = job.progress();

        return {
            id: job.id,
            state,
            progress,
            data: job.data,
            attemptsMade: job.attemptsMade,
            failedReason: job.failedReason,
            finishedOn: job.finishedOn,
            processedOn: job.processedOn,
        };
    }

    /**
     * Get queue statistics
     */
    async getStats() {
        const [tradeWaiting, tradeActive, tradeCompleted, tradeFailed] = await Promise.all([
            this.tradeQueue.getWaitingCount(),
            this.tradeQueue.getActiveCount(),
            this.tradeQueue.getCompletedCount(),
            this.tradeQueue.getFailedCount(),
        ]);

        const [instantWaiting, instantActive] = await Promise.all([
            this.instantQueue.getWaitingCount(),
            this.instantQueue.getActiveCount(),
        ]);

        return {
            trade: {
                waiting: tradeWaiting,
                active: tradeActive,
                completed: tradeCompleted,
                failed: tradeFailed,
            },
            instant: {
                waiting: instantWaiting,
                active: instantActive,
            },
        };
    }

    /**
     * Pause/resume queues
     */
    async pauseAll() {
        await Promise.all([
            this.tradeQueue.pause(),
            this.instantQueue.pause(),
        ]);
    }

    async resumeAll() {
        await Promise.all([
            this.tradeQueue.resume(),
            this.instantQueue.resume(),
        ]);
    }

    /**
     * Clean old jobs
     */
    async cleanOldJobs(age = 24 * 60 * 60 * 1000) {
        await Promise.all([
            this.tradeQueue.clean(age, 'completed'),
            this.tradeQueue.clean(age, 'failed'),
            this.instantQueue.clean(age, 'completed'),
            this.instantQueue.clean(age, 'failed'),
        ]);
    }

    /**
     * Setup event handlers
     */
    _setupEventHandlers() {
        // Trade queue events
        this.tradeQueue.on('completed', (job, result) => {
            console.log(`[Queue] Trade job ${job.id} completed:`, result?.offerId || 'success');
        });

        this.tradeQueue.on('failed', (job, err) => {
            console.error(`[Queue] Trade job ${job.id} failed:`, err.message);
        });

        this.tradeQueue.on('stalled', (job) => {
            console.warn(`[Queue] Trade job ${job.id} stalled`);
        });

        // Instant queue events
        this.instantQueue.on('completed', (job, result) => {
            console.log(`[Queue] Instant job ${job.id} completed`);
        });

        this.instantQueue.on('failed', (job, err) => {
            console.error(`[Queue] Instant job ${job.id} failed:`, err.message);
        });
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        await Promise.all([
            this.tradeQueue.close(),
            this.instantQueue.close(),
            this.priceQueue.close(),
        ]);
    }
}

// Singleton instance
const tradeQueueService = new TradeQueueService();

module.exports = {
    TradeQueueService,
    tradeQueueService,
};
