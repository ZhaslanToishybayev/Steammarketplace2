/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers for different services
 */

const CircuitBreaker = require('./CircuitBreaker');
const logger = require('../logger');

class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create a circuit breaker for a service
   * @param {string} serviceName - Service name
   * @param {Object} options - Circuit breaker options
   * @returns {CircuitBreaker} Circuit breaker instance
   */
  getBreaker(serviceName, options = {}) {
    if (!this.breakers.has(serviceName)) {
      const defaultOptions = {
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        monitoringPeriod: 10000, // 10 seconds
        expectedError: (error) => {
          // Don't count certain errors as failures
          if (error.statusCode) {
            // Client errors (4xx) are expected
            if (error.statusCode >= 400 && error.statusCode < 500) {
              return true;
            }
          }
          return false;
        },
        ...options
      };

      const breaker = new CircuitBreaker(defaultOptions);
      this.breakers.set(serviceName, breaker);

      logger.info(`Created circuit breaker for service: ${serviceName}`);
    }

    return this.breakers.get(serviceName);
  }

  /**
   * Execute an operation with circuit breaker protection
   * @param {string} serviceName - Service name
   * @param {Function} operation - Function to execute
   * @param {Function} fallback - Fallback function
   * @param {Object} options - Circuit breaker options
   * @returns {Promise<any>} Operation result or fallback
   */
  async execute(serviceName, operation, fallback = null, options = {}) {
    const breaker = this.getBreaker(serviceName, options);
    return await breaker.execute(operation, fallback);
  }

  /**
   * Get all circuit breakers
   */
  getAllBreakers() {
    return this.breakers;
  }

  /**
   * Get circuit breaker by name
   * @param {string} serviceName - Service name
   * @returns {CircuitBreaker|null} Circuit breaker instance
   */
  getBreakerByName(serviceName) {
    return this.breakers.get(serviceName) || null;
  }

  /**
   * Get statistics for all circuit breakers
   */
  getAllStats() {
    const stats = {};
    this.breakers.forEach((breaker, serviceName) => {
      stats[serviceName] = breaker.getStats();
    });
    return stats;
  }

  /**
   * Reset a specific circuit breaker
   * @param {string} serviceName - Service name
   */
  reset(serviceName) {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.reset();
      logger.info(`Circuit breaker reset for service: ${serviceName}`);
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    this.breakers.forEach((breaker, serviceName) => {
      breaker.reset();
    });
    logger.info('All circuit breakers reset');
  }

  /**
   * Remove a circuit breaker
   * @param {string} serviceName - Service name
   */
  remove(serviceName) {
    this.breakers.delete(serviceName);
    logger.info(`Circuit breaker removed for service: ${serviceName}`);
  }

  /**
   * Get summary of all circuit breakers
   */
  getSummary() {
    const summary = {
      total: this.breakers.size,
      closed: 0,
      open: 0,
      halfOpen: 0
    };

    this.breakers.forEach((breaker) => {
      if (breaker.state === 'CLOSED') summary.closed++;
      else if (breaker.state === 'OPEN') summary.open++;
      else if (breaker.state === 'HALF_OPEN') summary.halfOpen++;
    });

    return summary;
  }
}

module.exports = new CircuitBreakerRegistry();
