/**
 * Тестирование Rate Limit Handler
 * Демонстрация работы с 429 ошибками
 */

const RateLimitHandler = require('./services/rateLimitHandler');

// Создаём экземпляр
const rateLimiter = new RateLimitHandler({
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  enableBackoff: true,
  enableQueue: true,
  enableCache: true,
  cacheTTL: 60000
});

console.log('=== ТЕСТ RATE LIMIT HANDLER ===\n');

// Тест 1: Кэш
console.log('📦 Тест 1: Кэширование');
rateLimiter.setCache('test-key', { data: 'cached value' });
const cached = rateLimiter.getCache('test-key');
console.log('Кэш:', cached);

// Тест 2: Очередь с эмуляцией 429
console.log('\n📋 Тест 2: Обработка 429 ошибки');
async function simulateSteamAPIcall(callNumber) {
  return new Promise((resolve, reject) => {
    // Эмулируем 429 на первых 2 вызовах
    if (callNumber <= 2) {
      const error = new Error('RateLimitExceeded');
      error.eresult = 84;
      reject(error);
    } else {
      resolve(`Success: call ${callNumber}`);
    }
  });
}

(async () => {
  try {
    const result = await rateLimiter.addRequest(() => simulateSteamAPIcall(1));
    console.log('Результат:', result);
  } catch (error) {
    console.log('Ошибка:', error.message);
  }

  // Тест 3: Статистика
  console.log('\n📊 Тест 3: Статистика');
  const stats = rateLimiter.getStats();
  console.log(stats);

  console.log('\n✅ Тест завершён!');
})();
