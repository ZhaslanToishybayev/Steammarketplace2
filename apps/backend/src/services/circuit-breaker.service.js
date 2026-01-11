/**
 * Circuit Breaker for External APIs (Steam, etc.)
 * Prevents cascading failures when external services are down.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, requests fail immediately
 * - HALF_OPEN: Testing if service recovered
 * 
 * @module services/circuit-breaker
 */

// @ts-check

/**
 * @typedef {'CLOSED' | 'OPEN' | 'HALF_OPEN'} CircuitState
 */

/**
 * @typedef {Object} CircuitBreakerOptions
 * @property {string} name - Name of the circuit (for logging)
 * @property {number} [failureThreshold] - Failures before opening circuit (default: 5)
 * @property {number} [successThreshold] - Successes before closing from half-open (default: 2)
 * @property {number} [timeout] - Time in ms before trying half-open (default: 30000)
 */

class CircuitBreaker {
    /**
     * @param {CircuitBreakerOptions} options
     */
    constructor(options) {
        this.name = options.name;
        this.failureThreshold = options.failureThreshold || 5;
        this.successThreshold = options.successThreshold || 2;
        this.timeout = options.timeout || 30000; // 30 seconds

        /** @type {CircuitState} */
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        this.nextAttempt = 0;
    }

    /**
     * Execute a function with circuit breaker protection
     * @template T
     * @param {() => Promise<T>} fn - Async function to execute
     * @returns {Promise<T>}
     */
    async execute(fn) {
        if (this.state === 'OPEN') {
            // Check if timeout has passed
            if (Date.now() >= this.nextAttempt) {
                this.state = 'HALF_OPEN';
                this.successCount = 0;
                console.log(`[CircuitBreaker:${this.name}] State: HALF_OPEN - Testing recovery`);
            } else {
                const waitTime = Math.ceil((this.nextAttempt - Date.now()) / 1000);
                throw new Error(`Circuit breaker OPEN for ${this.name}. Retry in ${waitTime}s`);
            }
        }

        try {
            const result = await fn();
            this._onSuccess();
            return result;
        } catch (error) {
            this._onFailure();
            throw error;
        }
    }

    /**
     * Record a successful call
     */
    _onSuccess() {
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.state = 'CLOSED';
                this.failureCount = 0;
                console.log(`[CircuitBreaker:${this.name}] State: CLOSED - Service recovered ✅`);
            }
        } else {
            // Reset failure count on success in closed state
            this.failureCount = 0;
        }
    }

    /**
     * Record a failed call
     */
    _onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === 'HALF_OPEN') {
            // Any failure in half-open trips the circuit again
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.log(`[CircuitBreaker:${this.name}] State: OPEN - Recovery failed, waiting ${this.timeout / 1000}s`);
        } else if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.log(`[CircuitBreaker:${this.name}] State: OPEN - ${this.failureCount} failures, circuit tripped 🔴`);
        }
    }

    /**
     * Get current state info
     */
    getStatus() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null,
        };
    }

    /**
     * Manually reset the circuit breaker
     */
    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        console.log(`[CircuitBreaker:${this.name}] Manually reset to CLOSED`);
    }
}

// Pre-configured circuit breakers for common services
const steamApiBreaker = new CircuitBreaker({
    name: 'SteamAPI',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
});

const steamInventoryBreaker = new CircuitBreaker({
    name: 'SteamInventory',
    failureThreshold: 3,
    successThreshold: 1,
    timeout: 30000, // 30 seconds
});

module.exports = {
    CircuitBreaker,
    steamApiBreaker,
    steamInventoryBreaker,
};
