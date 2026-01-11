/**
 * Bot Session Service
 * Persistent session management to avoid Steam rate limits
 * 
 * Key features:
 * - Saves cookies to Redis after successful login
 * - Restores session on restart without new login
 * - Auto-refreshes sessions every 12 hours
 * - Login queue with delays between bots
 */

const Redis = require('ioredis');
const SteamTotp = require('steam-totp');

class BotSessionService {
    constructor(redisUrl) {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'redis',
            port: process.env.REDIS_PORT || 6379,
            family: 4,
            password: process.env.REDIS_PASSWORD,
            retryDelayOnFailover: 1000,
            maxRetriesPerRequest: 3,
            lazyConnect: true
        });
        this.sessionTTL = 86400; // 24 hours
        this.loginQueue = [];
        this.isProcessingQueue = false;
        this.loginDelay = 30000; // 30 seconds between logins
    }

    /**
     * Get session key for a bot
     */
    getSessionKey(accountName) {
        return `bot:session:${accountName}`;
    }

    /**
     * Save bot session (cookies) after successful login
     */
    async saveSession(accountName, cookies, steamId) {
        const sessionData = {
            cookies,
            steamId,
            savedAt: Date.now(),
            expiresAt: Date.now() + (this.sessionTTL * 1000),
        };

        await this.redis.set(
            this.getSessionKey(accountName),
            JSON.stringify(sessionData),
            'EX',
            this.sessionTTL
        );

        console.log(`[Session] Saved session for ${accountName}`);
        return true;
    }

    /**
     * Get saved session for a bot
     */
    async getSession(accountName) {
        const data = await this.redis.get(this.getSessionKey(accountName));

        if (!data) {
            return null;
        }

        try {
            const session = JSON.parse(data);

            // Check if session is expired
            if (session.expiresAt < Date.now()) {
                console.log(`[Session] Session expired for ${accountName}`);
                await this.clearSession(accountName);
                return null;
            }

            console.log(`[Session] Found valid session for ${accountName}`);
            return session;
        } catch (err) {
            console.error(`[Session] Failed to parse session for ${accountName}:`, err.message);
            return null;
        }
    }

    /**
     * Clear session for a bot
     */
    async clearSession(accountName) {
        await this.redis.del(this.getSessionKey(accountName));
        console.log(`[Session] Cleared session for ${accountName}`);
    }

    /**
     * Check if session exists and is valid
     */
    async hasValidSession(accountName) {
        const session = await this.getSession(accountName);
        return session !== null;
    }

    /**
     * Add login to queue (prevents rate limiting)
     */
    queueLogin(loginFn) {
        return new Promise((resolve, reject) => {
            this.loginQueue.push({ loginFn, resolve, reject });
            this.processLoginQueue();
        });
    }

    /**
     * Process login queue with delays
     */
    async processLoginQueue() {
        if (this.isProcessingQueue || this.loginQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.loginQueue.length > 0) {
            const { loginFn, resolve, reject } = this.loginQueue.shift();

            try {
                const result = await loginFn();
                resolve(result);
            } catch (err) {
                reject(err);
            }

            // Wait before next login
            if (this.loginQueue.length > 0) {
                console.log(`[Session] Waiting ${this.loginDelay / 1000}s before next login...`);
                await this.delay(this.loginDelay);
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get all active sessions
     */
    async getAllSessions() {
        const keys = await this.redis.keys('bot:session:*');
        const sessions = [];

        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                const session = JSON.parse(data);
                session.accountName = key.replace('bot:session:', '');
                sessions.push(session);
            }
        }

        return sessions;
    }

    /**
     * Schedule session refresh
     */
    scheduleRefresh(accountName, refreshFn, intervalMs = 12 * 60 * 60 * 1000) {
        setInterval(async () => {
            console.log(`[Session] Refreshing session for ${accountName}...`);
            try {
                await refreshFn();
                console.log(`[Session] Session refreshed for ${accountName}`);
            } catch (err) {
                console.error(`[Session] Failed to refresh session for ${accountName}:`, err.message);
            }
        }, intervalMs);
    }

    /**
     * Generate 2FA code with time sync
     */
    generateAuthCode(sharedSecret) {
        return SteamTotp.generateAuthCode(sharedSecret);
    }

    /**
     * Get time offset for Steam servers
     */
    async getTimeOffset() {
        return new Promise((resolve) => {
            SteamTotp.getTimeOffset((err, offset) => {
                if (err) {
                    console.warn('[Session] Failed to get time offset, using 0');
                    resolve(0);
                } else {
                    resolve(offset);
                }
            });
        });
    }
}

// Singleton instance
const sessionService = new BotSessionService();

module.exports = {
    BotSessionService,
    sessionService,
};
