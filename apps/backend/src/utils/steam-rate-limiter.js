/**
 * Steam Rate Limiter
 * Centralized rate limiter using Redis to prevent 429 Too Many Requests
 *
 * Requirements:
 * - Max 20 requests per minute (conservative limit)
 * - Distributed locking via Redis (safe for multiple workers)
 * - Auto-wait mechanism
 */

const { redisClient } = require('../config/redis');
const { logger } = require('../utils/logger');

class SteamRateLimiter {
    constructor() {
        this.key = 'steam:ratelimit';
        this.maxRequests = 20; // 20 requests per minute
        this.windowMs = 60000; // 1 minute window
    }

    /**
     * Wait for a rate limit slot
     * Blocks execution until a slot is available
     */
    async waitForSlot() {
        if (!redisClient || redisClient.status !== 'ready') {
            logger.warn('[SteamRateLimiter] Redis not ready, proceeding without rate limit check');
            return;
        }

        while (true) {
            const now = Date.now();
            // Create a window key based on the current minute
            const windowKey = `${this.key}:${Math.floor(now / this.windowMs)}`;

            try {
                // Increment request count for this window
                const count = await redisClient.incr(windowKey);

                // Set expiration if this is the first request in the window
                if (count === 1) {
                    await redisClient.expire(windowKey, 120); // 2 minutes TTL to be safe
                }

                // If within limit, proceed
                if (count <= this.maxRequests) {
                    if (count === this.maxRequests) {
                        logger.warn(`[SteamRateLimiter] Rate limit window saturated (${this.maxRequests} reqs)`);
                    }
                    return;
                }

                // Limit exceeded - wait until next window
                const msUntilNextWindow = this.windowMs - (now % this.windowMs);
                logger.info(`[SteamRateLimiter] Limit exceeded (${count}/${this.maxRequests}). Waiting ${msUntilNextWindow}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, msUntilNextWindow + 1000));
                
                // Loop continues, tries again in new window
            } catch (err) {
                logger.error('[SteamRateLimiter] Error checking rate limit:', err);
                // Fail open or closed? Let's sleep a bit and let it through to avoid deadlock
                await new Promise(resolve => setTimeout(resolve, 5000));
                return; 
            }
        }
    }

    /**
     * Execute an async function with rate limiting
     * @param {Function} asyncFn - Function to execute
     * @returns {Promise<any>} - Result of the function
     */
    async execute(asyncFn) {
        await this.waitForSlot();
        return await asyncFn();
    }
}

// Export singleton
module.exports = new SteamRateLimiter();
