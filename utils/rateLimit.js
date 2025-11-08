/**
 * Центральный RateLimitHandler для всего проекта
 * Используется во всех сервисах и маршрутах
 */

const RateLimitHandler = require('../services/rateLimitHandler');

// Создаём ОДИН экземпляр на всё приложение
const rateLimiter = new RateLimitHandler({
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  enableBackoff: true,
  enableQueue: true,
  enableCache: true,
  cacheTTL: 60000
});

console.log('[RateLimit] Central rate limiter initialized');

module.exports = rateLimiter;
