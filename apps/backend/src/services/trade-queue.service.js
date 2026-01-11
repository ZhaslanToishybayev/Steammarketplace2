// @ts-check
/**
 * Trade Queue Service
 * Bull queue for managing trade operations with priorities and retries
 * @module services/trade-queue
 */

const Bull = require('bull');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

/**
 * Trade Queue Service
 * Bull queue for managing trade operations with priorities and retries
 */

class TradeQueueService {
    constructor() {
        const redisOptions = {
            host: process.env.REDIS_HOST || 'redis',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            family: 4,
            password: process.env.REDIS_PASSWORD,
            maxRetriesPerRequest: null, // Bull requirement
            enableReadyCheck: false,    // Bull requirement
        };

        const bullOptions = {
            createClient: (type) => {
                switch (type) {
                    case 'client':
                        return new Redis(redisOptions);
                    case 'subscriber':
                        return new Redis(redisOptions);
                    case 'bclient':
                        return new Redis({ ...redisOptions, maxRetriesPerRequest: null });
                    default:
                        return new Redis(redisOptions);
                }
            },
            settings: {
                lockDuration: 30000,
                stalledInterval: 30000,
                maxStalledCount: 3,
            }
        };

        // Trade offer queue with rate limiting
        this.tradeQueue = new Bull('trade-offers', bullOptions);

        // Instant sell queue (higher priority)
        this.instantQueue = new Bull('instant-trades', bullOptions);

        // Price update queue
        this.priceQueue = new Bull('price-updates', bullOptions);

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
