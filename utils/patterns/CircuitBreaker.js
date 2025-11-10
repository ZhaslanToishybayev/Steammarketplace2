/**
 * Circuit Breaker Pattern Implementation
 * Protects external API calls from cascading failures
 */

const logger = require('../logger');

class CircuitBreaker {
  constructor(options = {}) {
    // Configuration
    this.failureThreshold = options.failureThreshold || 5; // Number of failures to open circuit
    this.recoveryTimeout = options.recoveryTimeout || 60000; // Time to wait before trying again (1 minute)
    this.monitoringPeriod = options.monitoringPeriod || 10000; // Time window to monitor failures (10 seconds)
    this.expectedError = options.expectedError || (() => false); // Function to identify expected errors

    // State
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.nextAttempt = Date.now();
    this.successCount = 0;
    this.requests = [];

    // Stats
    this.stats = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalTimeouts: 0,
      lastFailureTime: null,
      lastSuccessTime: null
    };
  }

  /**
   * Execute an operation with circuit breaker protection
   * @param {Function} operation - Function to execute
   * @param {Function} fallback - Fallback function when circuit is open
   * @returns {Promise<any>} Operation result or fallback
   */
  async execute(operation, fallback = null) {
    this.stats.totalRequests++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        // Still in open state, use fallback
        this.stats.totalFailures++;
        logger.warn(`Circuit breaker is OPEN, using fallback for operation`);
        return fallback ? await this._executeFallback(fallback) : null;
      } else {
        // Transition to half-open state
        this._transitionToHalfOpen();
      }
    }

    try {
      // Execute the operation
      const result = await this._executeOperation(operation);

      // Operation succeeded
      this._onSuccess();
      return result;
    } catch (error) {
      // Operation failed
      this._onFailure(error);
      return fallback ? await this._executeFallback(fallback) : null;
    }
  }

  /**
   * Execute the operation
   */
  async _executeOperation(operation) {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        operation(),
        this._createTimeoutPromise()
      ]);

      const duration = Date.now() - startTime;
      logger.debug(`Operation completed in ${duration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Operation failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Create a timeout promise
   */
  _createTimeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        this.stats.totalTimeouts++;
        reject(new Error('Operation timed out'));
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Handle operation success
   */
  _onSuccess() {
    this.stats.totalSuccesses++;
    this.stats.lastSuccessTime = new Date();

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      logger.info(`Circuit breaker HALF_OPEN - successful attempt ${this.successCount}`);

      // If we've had enough successes, close the circuit
      if (this.successCount >= 3) {
        this._transitionToClosed();
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Handle operation failure
   */
  _onFailure(error) {
    this.stats.totalFailures++;
    this.stats.lastFailureTime = new Date();
    this.failureCount++;

    // Don't count expected errors (like 404) as failures
    if (!this.expectedError(error)) {
      logger.error(`Operation failed (${this.failureCount}/${this.failureThreshold}):`, error.message);

      if (this.state === 'CLOSED' || this.state === 'HALF_OPEN') {
        if (this.failureCount >= this.failureThreshold) {
          this._transitionToOpen();
        }
      }
    } else {
      logger.debug(`Expected error occurred:`, error.message);
    }
  }

  /**
   * Execute fallback function
   */
  async _executeFallback(fallback) {
    try {
      if (typeof fallback === 'function') {
        return await fallback();
      }
      return fallback;
    } catch (error) {
      logger.error('Fallback execution failed:', error);
      return null;
    }
  }

  /**
   * Transition to CLOSED state
   */
  _transitionToClosed() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    logger.info('Circuit breaker transitioning to CLOSED state');
  }

  /**
   * Transition to OPEN state
   */
  _transitionToOpen() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.recoveryTimeout;
    logger.warn(`Circuit breaker transitioning to OPEN state (failures: ${this.failureCount})`);
  }

  /**
   * Transition to HALF_OPEN state
   */
  _transitionToHalfOpen() {
    this.state = 'HALF_OPEN';
    this.successCount = 0;
    logger.info('Circuit breaker transitioning to HALF_OPEN state');
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
      stats: this.stats
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    logger.info('Circuit breaker manually reset to CLOSED state');
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    const successRate = this.stats.totalRequests > 0
      ? (this.stats.totalSuccesses / this.stats.totalRequests * 100).toFixed(2)
      : 0;

    return {
      state: this.state,
      totalRequests: this.stats.totalRequests,
      totalSuccesses: this.stats.totalSuccesses,
      totalFailures: this.stats.totalFailures,
      totalTimeouts: this.stats.totalTimeouts,
      successRate: `${successRate}%`,
      lastSuccessTime: this.stats.lastSuccessTime,
      lastFailureTime: this.stats.lastFailureTime,
      isOpen: this.state === 'OPEN',
      isHalfOpen: this.state === 'HALF_OPEN'
    };
  }
}

module.exports = CircuitBreaker;
