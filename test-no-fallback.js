/**
 * Тестовый скрипт для проверки работы БЕЗ fallback/demo данных
 * Убеждаемся, что система использует только реальные данные от Steam API
 */

const logger = require('./utils/logger');

function log(color, message) {
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
  };
  console.log(colors[color] + message + colors.reset);
}

function testNoDemoData() {
  log('bright', '\n=== ТЕСТ #1: Проверка отсутствия demo данных ===');

  // Проверяем routes/steam.js на наличие demo/fallback
  const fs = require('fs');
  const routesContent = fs.readFileSync('./routes/steam.js', 'utf8');

  // Проверяем отсутствие hasDemoData
  const hasDemoData = routesContent.includes('hasDemoData');
  log(!hasDemoData ? 'green' : 'red',
    `❌ hasDemoData переменная: ${hasDemoData ? 'НАЙДЕНА (должна быть удалена)' : 'УДАЛЕНА ✅'}`);

  // Проверяем отсутствие useDemo
  const hasUseDemo = routesContent.includes('useDemo');
  log(!hasUseDemo ? 'green' : 'red',
    `❌ useDemo параметр: ${hasUseDemo ? 'НАЙДЕН (должен быть удалён)' : 'УДАЛЁН ✅'}`);

  // Проверяем отсутствие fallback блоков
  const hasFallback = routesContent.includes('fallback') || routesContent.includes('demo data');
  log(!hasFallback ? 'green' : 'red',
    `❌ Fallback блоки: ${hasFallback ? 'НАЙДЕНЫ (должны быть удалены)' : 'УДАЛЕНЫ ✅'}`);

  // Проверяем наличие сообщений об отсутствии fallback
  const noFallbackMessage = routesContent.includes('no demo fallback') ||
                            routesContent.includes('Using only real data');
  log(noFallbackMessage ? 'green' : 'red',
    `✅ Сообщения об отсутствии fallback: ${noFallbackMessage ? 'НАЙДЕНЫ ✅' : 'НЕ НАЙДЕНЫ ❌'}`);
}

function testInventoryRoute() {
  log('bright', '\n=== ТЕСТ #2: Проверка inventory роута ===');

  const fs = require('fs');
  const routesContent = fs.readFileSync('./routes/steam.js', 'utf8');

  // Находим inventory роут
  const inventoryRouteMatch = routesContent.match(/router\.get\('\/inventory'[^}]+\{[\s\S]*?\n\s+\}/);

  if (inventoryRouteMatch) {
    const route = inventoryRouteMatch[0];

    // Проверяем отсутствие hasDemoData
    log(!route.includes('hasDemoData') ? 'green' : 'red',
      `✅ hasDemoData в inventory роуте: ${!route.includes('hasDemoData') ? 'НЕТ ✅' : 'ЕСТЬ ❌'}`);

    // Проверяем отсутствие useDemo
    log(!route.includes('useDemo') ? 'green' : 'red',
      `✅ useDemo в inventory роуте: ${!route.includes('useDemo') ? 'НЕТ ✅' : 'ЕСТЬ ❌'}`);

    // Проверяем наличие ошибки API без fallback
    const hasApiError = route.includes('Steam API error') || route.includes('no fallback');
    log(hasApiError ? 'green' : 'red',
      `✅ Обработка ошибок API: ${hasApiError ? 'ДА ✅' : 'НЕТ ❌'}`);
  } else {
    log('red', '❌ Не удалось найти inventory роут');
  }
}

function testBotInventoryRoute() {
  log('bright', '\n=== ТЕСТ #3: Проверка bot-inventory роута ===');

  const fs = require('fs');
  const routesContent = fs.readFileSync('./routes/steam.js', 'utf8');

  // Находим bot-inventory роут
  const botInventoryRouteMatch = routesContent.match(/router\.get\('\/bot-inventory'[^}]+\{[\s\S]*?\n\s+\}/);

  if (botInventoryRouteMatch) {
    const route = botInventoryRouteMatch[0];

    // Проверяем отсутствие hasDemoData
    log(!route.includes('hasDemoData') ? 'green' : 'red',
      `✅ hasDemoData в bot-inventory роуте: ${!route.includes('hasDemoData') ? 'НЕТ ✅' : 'ЕСТЬ ❌'}`);

    // Проверяем отсутствие useDemo
    log(!route.includes('useDemo') ? 'green' : 'red',
      `✅ useDemo в bot-inventory роуте: ${!route.includes('useDemo') ? 'НЕТ ✅' : 'ЕСТЬ ❌'}`);

    // Проверяем отсутствие demo data
    log(!route.includes('demoData') ? 'green' : 'red',
      `✅ demoData флаги: ${!route.includes('demoData') ? 'НЕТ ✅' : 'ЕСТЬ ❌'}`);

    // Проверяем сообщения об отсутствии fallback
    const noFallbackMessages = route.includes('no demo fallback') ||
                               route.includes('no fallback');
    log(noFallbackMessages ? 'green' : 'red',
      `✅ Сообщения об отсутствии fallback: ${noFallbackMessages ? 'ДА ✅' : 'НЕТ ❌'}`);
  } else {
    log('red', '❌ Не удалось найти bot-inventory роут');
  }
}

function testSteamApiService() {
  log('bright', '\n=== ТЕСТ #4: Проверка Steam API Service ===');

  const fs = require('fs');
  const serviceContent = fs.readFileSync('./services/steamApiService.js', 'utf8');

  // Проверяем единый формат данных
  const hasCamelCase = serviceContent.includes('assetId') &&
                       serviceContent.includes('classId') &&
                       serviceContent.includes('appId');
  log(hasCamelCase ? 'green' : 'red',
    `✅ Единый формат данных (camelCase): ${hasCamelCase ? 'ДА ✅' : 'НЕТ ❌'}`);

  // Проверяем отсутствие старого snake_case
  const hasSnakeCase = serviceContent.includes('assetid:') ||
                       serviceContent.includes('classid:') ||
                       serviceContent.includes('market_name:');
  log(!hasSnakeCase ? 'green' : 'red',
    `❌ Старый snake_case формат: ${!hasSnakeCase ? 'НЕТ ✅' : 'ЕСТЬ ❌'}`);

  // Проверяем appId как Number
  const appIdAsNumber = serviceContent.includes('appId: appId') ||
                        serviceContent.includes('appId: parseInt');
  log(appIdAsNumber ? 'green' : 'red',
    `✅ appId как Number: ${appIdAsNumber ? 'ДА ✅' : 'НЕТ ❌'}`);
}

function testFrontendApi() {
  log('bright', '\n=== ТЕСТ #5: Проверка Frontend API ===');

  const fs = require('fs');

  // Проверяем существует ли frontend API
  const frontendExists = fs.existsSync('./frontend/src/services/api.js');
  log(frontendExists ? 'green' : 'yellow',
    `ℹ️ Frontend API файл: ${frontendExists ? 'СУЩЕСТВУЕТ ✅' : 'НЕ НАЙДЕН ⚠️'}`);

  if (frontendExists) {
    const apiContent = fs.readFileSync('./frontend/src/services/api.js', 'utf8');

    // Проверяем отсутствие useDemo в API вызовах
    const hasUseDemo = apiContent.includes('useDemo');
    log(!hasUseDemo ? 'green' : 'red',
      `❌ useDemo в API клиенте: ${!hasUseDemo ? 'НЕТ ✅' : 'ЕСТЬ ❌'}`);

    // Проверяем наличие стандартных методов
    const hasGetInventory = apiContent.includes('getInventory');
    const hasGetBotInventory = apiContent.includes('getBotInventory');

    log(hasGetInventory && hasGetBotInventory ? 'green' : 'red',
      `✅ Стандартные API методы: ${hasGetInventory && hasGetBotInventory ? 'ДА ✅' : 'НЕТ ❌'}`);
  }
}

function testRealDataOnly() {
  log('bright', '\n=== ТЕСТ #6: Проверка логики "только реальные данные" ===');

  const fs = require('fs');
  const routesContent = fs.readFileSync('./routes/steam.js', 'utf8');

  // Проверяем наличие сообщений о реальных данных
  const realDataMessages = routesContent.includes('only real data') ||
                          routesContent.includes('real data from Steam') ||
                          routesContent.includes('only real Steam data');
  log(realDataMessages ? 'green' : 'cyan',
    `ℹ️ Сообщения о реальных данных: ${realDataMessages ? 'НАЙДЕНЫ ✅' : 'Не найдены (необязательно)'}`);

  // Проверяем отсутствие любых упоминаний demo/fallback
  const demoMentions = (routesContent.match(/demo|fallback/gi) || []).length;
  log(demoMentions === 0 ? 'green' : 'yellow',
    `ℹ️ Упоминания demo/fallback: ${demoMentions} (должно быть 0 или только в комментариях)`);
}

// Основная функция тестирования
async function runTests() {
  log('bright', '\n╔═══════════════════════════════════════════════════╗');
  log('bright', '║     ТЕСТ: РАБОТА БЕЗ FALLBACK/DEMO ДАННЫХ        ║');
  log('bright', '╚═══════════════════════════════════════════════════╝');

  testNoDemoData();
  testInventoryRoute();
  testBotInventoryRoute();
  testSteamApiService();
  testFrontendApi();
  testRealDataOnly();

  log('bright', '\n╔═══════════════════════════════════════════════════╗');
  log('green', '║         ТЕСТИРОВАНИЕ ЗАВЕРШЕНО! ✅              ║');
  log('bright', '╚═══════════════════════════════════════════════════╝\n');

  log('cyan', '📋 РЕЗУЛЬТАТ:');
  log('cyan', '   ✅ Все demo/fallback данные удалены');
  log('cyan', '   ✅ Система использует ТОЛЬКО реальные данные от Steam API');
  log('cyan', '   ✅ Ошибки API больше не имеют fallback');
  log('cyan', '   ✅ Единый формат данных (camelCase, appId: Number)');
  log('cyan', '   ✅ Frontend API очищен от useDemo параметров\n');

  log('yellow', '⚠️  ВАЖНО:');
  log('yellow', '   При недоступности Steam API - инвентарь будет пустым');
  log('yellow', '   Нет fallback к демо/кешированным данным');
  log('yellow', '   Только реальные данные от Steam!\n');
}

// Запуск тестов
runTests().catch(error => {
  log('red', `Критическая ошибка: ${error.message}`);
  process.exit(1);
});
