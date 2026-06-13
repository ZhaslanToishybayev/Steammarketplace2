// @ts-check
/**
 * Trade Queue Service
 * Bull queue for managing trade operations with priorities and retries
 * @module services/trade-queue
 */

const Bull = require('bull');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const telegram = require('./telegram-bot.service');

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

        // Dead Letter Queue for failed job analysis and auto-remediation
        this.dlq = new Bull('dead-letter-queue', bullOptions);

        // Trade delay for rate limiting (can be adjusted by DLQ remediation)
        this.tradeDelay = 10000; // 10 seconds default

        this._setupEventHandlers();
        this.startWatchdog();
        this.startDLQProcessor();
    }

    /**
     * Start Queue Watchdog
     * Monitors queue health and alerts on stagnation
     */
    startWatchdog() {
        this.lastFailedCount = 0;
        this.lastCheckTime = Date.now();
        this.cleanupCounter = 0;
        this.lastWaitingCount = 0;
        this.lastSuccessRate = 100;
        this.predictiveAlertsSent = {
            sessionAge: false,
            backlog: false,
            degradation: false
        };
        
        // Check every 5 minutes
        setInterval(async () => {
            try {
                const stats = await this.getStats();
                const now = Date.now();
                const timeDelta = (now - this.lastCheckTime) / 1000 / 60; // minutes
                
                // Alert if backlog is high (potential stuck worker)
                if (stats.trade.waiting > 50) {
                    await telegram.sendCriticalError('Trade Queue', `Queue BACKLOG CRITICAL: ${stats.trade.waiting} jobs waiting!`);
                } else if (stats.trade.waiting > 10) {
                    await telegram.sendMessage(`⚠️ Trade Queue Warning: ${stats.trade.waiting} jobs waiting.`, 'warning');
                }

                // Alert on NEW failures only (not accumulated)
                const newFailures = stats.trade.failed - this.lastFailedCount;
                if (newFailures > 5) {
                     await telegram.sendMessage(`⚠️ High Trade Failure Rate: ${newFailures} new failed jobs in last 5 minutes. Check logs.`, 'warning');
                }
                
                // PREDICTIVE ALERTS
                
                // 1. Queue growth rate (predict backlog)
                if (timeDelta > 0) {
                    const queueGrowth = stats.trade.waiting - this.lastWaitingCount;
                    const growthRate = queueGrowth / timeDelta; // jobs per minute
                    
                    if (growthRate > 10 && !this.predictiveAlertsSent.backlog) {
                        await telegram.sendMessage(
                            `🟡 Predictive Alert: Queue growing at ${growthRate.toFixed(1)} jobs/min. Possible backlog incoming.`,
                            'warning'
                        );
                        this.predictiveAlertsSent.backlog = true;
                    } else if (growthRate < 5) {
                        this.predictiveAlertsSent.backlog = false;
                    }
                }
                
                // 2. Success rate degradation
                const totalProcessed = stats.trade.completed + stats.trade.failed;
                if (totalProcessed > 0) {
                    const currentSuccessRate = (stats.trade.completed / totalProcessed) * 100;
                    if (currentSuccessRate < 80 && this.lastSuccessRate >= 80 && !this.predictiveAlertsSent.degradation) {
                        await telegram.sendMessage(
                            `🟠 Predictive Alert: Success rate dropped to ${currentSuccessRate.toFixed(1)}%. Service degradation detected.`,
                            'warning'
                        );
                        this.predictiveAlertsSent.degradation = true;
                    } else if (currentSuccessRate >= 90) {
                        this.predictiveAlertsSent.degradation = false;
                    }
                    this.lastSuccessRate = currentSuccessRate;
                }
                
                this.lastFailedCount = stats.trade.failed;
                this.lastWaitingCount = stats.trade.waiting;
                this.lastCheckTime = now;
                
                // Auto-cleanup old failed jobs every 12 checks (1 hour)
                this.cleanupCounter++;
                if (this.cleanupCounter >= 12) {
                    this.cleanupCounter = 0;
                    const cleaned = await this.cleanOldJobs(24 * 60 * 60 * 1000);
                    console.log(`[Queue Watchdog] Auto-cleaned old jobs`);
                }

            } catch (err) {
                console.error('[Queue Watchdog] Check failed:', err.message);
            }
        }, 5 * 60 * 1000);
        
        console.log('[Queue] Watchdog started (with predictive alerts)');
    }

    /**
     * Start DLQ Processor
     * Analyzes failed jobs and executes auto-remediation
     */
    startDLQProcessor() {
        // Process DLQ every 5 minutes
        setInterval(async () => {
            try {
                await this._processDLQ();
            } catch (err) {
                console.error('[DLQ Processor] Failed:', err.message);
            }
        }, 5 * 60 * 1000);
        
        console.log('[DLQ] Processor started');
    }

    /**
     * Process Dead Letter Queue
     * Analyze patterns and execute remediation
     */
    async _processDLQ() {
        const failedJobs = await this.dlq.getFailed();
        if (failedJobs.length === 0) return;

        console.log(`[DLQ] Analyzing ${failedJobs.length} failed jobs...`);

        // Analyze error patterns
        const errorPatterns = {};
        failedJobs.forEach(job => {
            const errorMsg = job.failedReason || 'Unknown';
            let errorType = 'UNKNOWN';
            
            if (errorMsg.includes('(15)')) errorType = 'SESSION_ERROR';
            else if (errorMsg.includes('429')) errorType = 'RATE_LIMIT';
            else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED')) errorType = 'NETWORK_ERROR';
            else if (errorMsg.includes('timeout')) errorType = 'TIMEOUT_ERROR';
            
            errorPatterns[errorType] = (errorPatterns[errorType] || 0) + 1;
        });

        // Calculate percentages
        const total = failedJobs.length;
        const patterns = Object.entries(errorPatterns).map(([type, count]) => ({
            type,
            count,
            percentage: (count / total) * 100
        }));

        // Check for dominant patterns (>70%)
        const dominantPattern = patterns.find(p => p.percentage >= 70);
        
        if (dominantPattern) {
            console.log(`[DLQ] Dominant pattern detected: ${dominantPattern.type} (${dominantPattern.percentage.toFixed(1)}%)`);
            await this._executeRemediation(dominantPattern.type, dominantPattern.percentage);
        }

        // Clean processed jobs from DLQ
        for (const job of failedJobs) {
            await job.remove();
        }
    }

    /**
     * Execute remediation based on error pattern
     */
    async _executeRemediation(errorType, percentage) {
        const { botManager } = require('./bot-manager.service');
        
        switch (errorType) {
            case 'SESSION_ERROR':
                if (percentage >= 70) {
                    console.log('[DLQ] Executing remediation: Relogin all bots');
                    await telegram.sendMessage(
                        `🔧 Auto-remediation: ${percentage.toFixed(0)}% errors are session-related. Relogin all bots...`,
                        'warning'
                    );
                    await botManager.reloginAllBots();
                }
                break;
                
            case 'RATE_LIMIT':
                if (percentage >= 70) {
                    console.log('[DLQ] Executing remediation: Increase rate limiting');
                    await telegram.sendMessage(
                        `🔧 Auto-remediation: ${percentage.toFixed(0)}% errors are rate limits. Increasing delays...`,
                        'warning'
                    );
                    // Increase trade delay temporarily
                    this.tradeDelay = Math.min(this.tradeDelay * 2, 60000); // Max 60s
                }
                break;
                
            case 'NETWORK_ERROR':
                console.log('[DLQ] Network errors detected, monitoring...');
                // Network issues usually resolve themselves
                break;
                
            default:
                console.log(`[DLQ] No remediation strategy for ${errorType}`);
        }
    }

    /**
     * Move job to Dead Letter Queue after max retries
     */
    async moveToDLQ(job, failedReason) {
        console.log(`[DLQ] Moving job ${job.id} to DLQ: ${failedReason}`);
        
        await this.dlq.add('failed-job', {
            originalJobId: job.id,
            data: job.data,
            failedReason,
            failedAt: new Date().toISOString(),
            attempts: job.attemptsMade
        });
    }

    /**
     * Validate trade URL format
     */
    validateTradeUrl(tradeUrl) {
        if (!tradeUrl) {
            return { valid: false, error: 'Trade URL is required' };
        }
        
        const tradeUrlRegex = /^https?:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[a-zA-Z0-9_-]+$/;
        if (!tradeUrlRegex.test(tradeUrl)) {
            return { valid: false, error: 'Invalid trade URL format' };
        }
        
        // Extract SteamID from trade URL
        const partnerMatch = tradeUrl.match(/partner=(\d+)/);
        if (!partnerMatch) {
            return { valid: false, error: 'Cannot extract partner ID from trade URL' };
        }
        
        const partnerId = parseInt(partnerMatch[1]);
        if (partnerId === 0 || isNaN(partnerId)) {
            return { valid: false, error: 'Invalid partner ID in trade URL' };
        }
        
        return { valid: true };
    }

    /**
     * Add trade offer job to queue
     */
    async addTradeJob(data, options = {}) {
        const jobId = uuidv4();

        // Validate trade URL before adding to queue
        if (data.tradeUrl) {
            const validation = this.validateTradeUrl(data.tradeUrl);
            if (!validation.valid) {
                console.error(`[Queue] Invalid trade URL for job ${jobId}: ${validation.error}`);
                throw new Error(`Trade URL validation failed: ${validation.error}`);
            }
        }

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

        this.tradeQueue.on('failed', async (job, err) => {
            console.error(`[Queue] Trade job ${job.id} failed (attempt ${job.attemptsMade}):`, err.message);
            
            // Move to DLQ after 3 failed attempts
            if (job.attemptsMade >= 3) {
                await this.moveToDLQ(job, err.message);
            }
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
