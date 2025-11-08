/**
 * Middleware для автоматической защиты от 429 ошибок
 * Используется для защиты всех маршрутов API
 */

const rateLimiter = require('../utils/rateLimit');

/**
 * Middleware для автоматического применения rate limiting
 * Добавляет задержку между запросами для предотвращения 429 ошибок
 */
function rateLimitMiddleware(req, res, next) {
  // Добавляем минимальную задержку между запросами
  const minDelay = 500; // 500ms между запросами

  // Сохраняем время последнего запроса в res.locals
  if (!res.locals.lastRequestTime) {
    res.locals.lastRequestTime = 0;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - res.locals.lastRequestTime;

  if (timeSinceLastRequest < minDelay) {
    const waitTime = minDelay - timeSinceLastRequest;
    console.log(`[RateLimitMiddleware] Задержка ${waitTime}ms для предотвращения 429`);
    return setTimeout(() => {
      res.locals.lastRequestTime = Date.now();
      next();
    }, waitTime);
  }

  res.locals.lastRequestTime = now;
  next();
}

/**
 * Функция для безопасного выполнения API запросов с rate limiting
 * Используется в маршрутах и контроллерах
 */
async function withRateLimit(asyncFunction) {
  try {
    return await rateLimiter.addRequest(asyncFunction);
  } catch (error) {
    const isRateLimit = error.message.includes('RateLimitExceeded') ||
                       error.message.includes('429') ||
                       error.eresult === 84;

    if (isRateLimit) {
      console.error('[RateLimitMiddleware] Превышен лимит запросов:', error.message);
      throw new Error('Слишком много запросов. Попробуйте позже.');
    }

    throw error;
  }
}

module.exports = {
  rateLimitMiddleware,
  withRateLimit,
  rateLimiter // Экспортируем для прямого использования
};
