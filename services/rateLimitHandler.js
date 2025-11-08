/**
 * Rate Limit Handler - Кастомное решение для Steam API
 * Обрабатывает ошибки 429 и оптимизирует запросы
 */

const EventEmitter = require('events');

class RateLimitHandler extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      maxRetries: options.maxRetries || 5,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 60000,
      queueSize: options.queueSize || 10,
      enableBackoff: options.enableBackoff !== false,
      enableQueue: options.enableQueue !== false,
      enableCache: options.enableCache !== false,
      cacheTTL: options.cacheTTL || 300000 // 5 минут
    };

    this.requestQueue = [];
    this.activeRequests = 0;
    this.maxConcurrent = 3;
    this.cache = new Map();
    this.retryCount = new Map();
    this.lastRequestTime = 0;
  }

  /**
   * Добавить запрос в очередь
   */
  async addRequest(requestFn, options = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        fn: requestFn,
        resolve,
        reject,
        priority: options.priority || 0,
        timestamp: Date.now()
      };

      this.requestQueue.push(request);
      this.requestQueue.sort((a, b) => b.priority - a.priority);

      this.processQueue();
    });
  }

  /**
   * Обработка очереди
   */
  async processQueue() {
    if (this.activeRequests >= this.maxConcurrent) return;

    const request = this.requestQueue.shift();
    if (!request) return;

    this.activeRequests++;

    try {
      // Задержка между запросами
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.config.baseDelay) {
        await this.sleep(this.config.baseDelay - timeSinceLastRequest);
      }

      const result = await this.executeWithRetry(request.fn);
      this.lastRequestTime = Date.now();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      // Продолжаем обработку следующего запроса
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Выполнение с повторными попытками
   */
  async executeWithRetry(fn, retryCount = 0) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error.message.includes('RateLimitExceeded') ||
                         error.message.includes('429') ||
                         error.eresult === 84;

      if (isRateLimit && retryCount < this.config.maxRetries) {
        const delay = this.calculateDelay(retryCount);
        console.log(`[RateLimit] Ошибка 429, повтор через ${delay/1000}s (попытка ${retryCount + 1}/${this.config.maxRetries})`);

        await this.sleep(delay);
        return this.executeWithRetry(fn, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Вычисление задержки (экспоненциальный backoff + jitter)
   */
  calculateDelay(retryCount) {
    if (!this.config.enableBackoff) return this.config.baseDelay;

    const exponentialDelay = Math.min(
      this.config.baseDelay * Math.pow(2, retryCount),
      this.config.maxDelay
    );

    // Добавляем случайность (jitter) 25%
    const jitter = exponentialDelay * 0.25 * Math.random();

    return exponentialDelay + jitter;
  }

  /**
   * Кэширование с TTL
   */
  getCache(key) {
    if (!this.config.enableCache) return null;

    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      console.log(`[Cache] Кэш попадание для ${key}`);
      return cached.data;
    }

    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    if (!this.config.enableCache) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Утилита сна
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Статистика
   */
  getStats() {
    return {
      queueSize: this.requestQueue.length,
      activeRequests: this.activeRequests,
      cacheSize: this.cache.size,
      maxConcurrent: this.maxConcurrent
    };
  }

  /**
   * Очистка кэша
   */
  clearCache() {
    this.cache.clear();
    console.log('[RateLimit] Кэш очищен');
  }
}

module.exports = RateLimitHandler;
