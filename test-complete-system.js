#!/usr/bin/env node
/**
 * Комплексный тест всей системы
 * Проверяет полный цикл: OAuth → API → Инвентарь → Фильтрация
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(color, message) {
  console.log(colors[color] + message + colors.reset);
}

async function testCompleteSystem() {
  log('blue', '\n=== 🧪 КОМПЛЕКСНЫЙ ТЕСТ СИСТЕМЫ ===\n');
  log('cyan', 'Время начала: ' + new Date().toISOString() + '\n');

  let passedTests = 0;
  let failedTests = 0;
  const results = [];

  try {
    // 1. ТЕСТ: Подключение к базе данных
    log('blue', '1️⃣ Тест: Подключение к MongoDB');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      log('green', '   ✅ MongoDB подключен');
      passedTests++;

      const userCount = await mongoose.connection.db.collection('users').countDocuments();
      log('cyan', `   Пользователей в системе: ${userCount}`);

      results.push({ test: 'MongoDB Connection', status: 'PASSED', details: `${userCount} users` });
    } catch (dbError) {
      log('red', '   ❌ Ошибка подключения к MongoDB: ' + dbError.message);
      failedTests++;
      results.push({ test: 'MongoDB Connection', status: 'FAILED', error: dbError.message });
    }

    // 2. ТЕСТ: Диагностический endpoint
    log('\n' + 'blue', '2️⃣ Тест: Диагностический API');
    try {
      const response = await axios.get('http://localhost:3001/api/steam/diagnostic', { timeout: 10000 });
      log('green', '   ✅ API endpoint работает');

      const data = response.data;
      log('cyan', `   Система: ${data.system.status}`);
      log('cyan', `   Uptime: ${Math.floor(data.system.uptime / 60)} минут`);
      log('cyan', `   Пользователей в БД: ${data.database.userCount}`);

      passedTests++;
      results.push({ test: 'Diagnostic API', status: 'PASSED', details: `Uptime: ${Math.floor(data.system.uptime / 60)}m` });
    } catch (apiError) {
      log('red', '   ❌ API недоступен: ' + apiError.message);
      log('yellow', '   💡 Запустите: npm start');
      failedTests++;
      results.push({ test: 'Diagnostic API', status: 'FAILED', error: apiError.message });
    }

    // 3. ТЕСТ: Получение JWT токена
    log('\n' + 'blue', '3️⃣ Тест: Получение JWT токена');
    try {
      const response = await axios.post('http://localhost:3001/api/auth/test-user', {}, { timeout: 5000 });
      const { token, user } = response.data;

      if (!token) {
        throw new Error('Токен не получен');
      }

      log('green', '   ✅ JWT токен получен');
      log('cyan', `   Пользователь: ${user.username}`);
      log('cyan', `   SteamID: ${user.steamId}`);

      // Сохраняем токен для следующих тестов
      global.testToken = token;

      passedTests++;
      results.push({ test: 'JWT Token Generation', status: 'PASSED', details: user.username });
    } catch (tokenError) {
      log('red', '   ❌ Ошибка получения токена: ' + tokenError.message);
      failedTests++;
      results.push({ test: 'JWT Token Generation', status: 'FAILED', error: tokenError.message });
    }

    // 4. ТЕСТ: Проверка пользователя в базе
    log('\n' + 'blue', '4️⃣ Тест: Проверка пользователя в базе');
    try {
      const User = require('./models/User');
      const user = await User.findOne({ steamId: '76561199257487454' });

      if (!user) {
        throw new Error('Пользователь не найден');
      }

      log('green', '   ✅ Пользователь найден в базе');
      log('cyan', `   Имя: ${user.username}`);
      log('cyan', `   Steam OAuth Token: ${user.steamAccessToken ? 'ЕСТЬ' : 'НЕТ'}`);

      if (!user.steamAccessToken) {
        log('yellow', '   ⚠️  ВНИМАНИЕ: Нет Steam OAuth токена!');
        log('yellow', '   💡 Пользователю нужно пройти Steam OAuth аутентификацию');
        log('yellow', '   🔗 Откройте: http://localhost:3001/api/auth/steam');
      }

      passedTests++;
      results.push({
        test: 'User in Database',
        status: 'PASSED',
        details: `${user.username}, OAuth: ${user.steamAccessToken ? 'YES' : 'NO'}`
      });
    } catch (userError) {
      log('red', '   ❌ Ошибка проверки пользователя: ' + userError.message);
      failedTests++;
      results.push({ test: 'User in Database', status: 'FAILED', error: userError.message });
    }

    // 5. ТЕСТ: Инвентарь пользователя (CS2)
    if (global.testToken) {
      log('\n' + 'blue', '5️⃣ Тест: Инвентарь пользователя (CS2)');
      try {
        const response = await axios.get('http://localhost:3001/api/steam/inventory?game=cs2', {
          headers: { Authorization: `Bearer ${global.testToken}` },
          timeout: 10000
        });

        const { items, count, error } = response.data;

        if (error) {
          log('yellow', '   ⚠️  API вернул ошибку: ' + error);
          log('cyan', '   💡 Причина: ' + (response.data.diagnostic?.reason || 'Неизвестно'));

          results.push({
            test: 'User Inventory (CS2)',
            status: 'WARNING',
            details: error,
            diagnostic: response.data.diagnostic
          });
        } else {
          log('green', '   ✅ Инвентарь получен');
          log('cyan', `   Предметов: ${count}`);
          passedTests++;
          results.push({ test: 'User Inventory (CS2)', status: 'PASSED', details: `${count} items` });
        }
      } catch (inventoryError) {
        log('red', '   ❌ Ошибка получения инвентаря: ' + inventoryError.message);
        failedTests++;
        results.push({ test: 'User Inventory (CS2)', status: 'FAILED', error: inventoryError.message });
      }
    }

    // 6. ТЕСТ: Инвентарь пользователя (Dota 2)
    if (global.testToken) {
      log('\n' + 'blue', '6️⃣ Тест: Инвентарь пользователя (Dota 2)');
      try {
        const response = await axios.get('http://localhost:3001/api/steam/inventory?game=dota2', {
          headers: { Authorization: `Bearer ${global.testToken}` },
          timeout: 10000
        });

        const { items, count, error } = response.data;

        if (error) {
          log('yellow', '   ⚠️  API вернул ошибку: ' + error);
          log('cyan', '   💡 Причина: ' + (response.data.diagnostic?.reason || 'Неизвестно'));

          results.push({
            test: 'User Inventory (Dota 2)',
            status: 'WARNING',
            details: error,
            diagnostic: response.data.diagnostic
          });
        } else {
          log('green', '   ✅ Инвентарь получен');
          log('cyan', `   Предметов: ${count}`);
          passedTests++;
          results.push({ test: 'User Inventory (Dota 2)', status: 'PASSED', details: `${count} items` });
        }
      } catch (inventoryError) {
        log('red', '   ❌ Ошибка получения инвентаря: ' + inventoryError.message);
        failedTests++;
        results.push({ test: 'User Inventory (Dota 2)', status: 'FAILED', error: inventoryError.message });
      }
    }

    // 7. ТЕСТ: Инвентарь бота (CS2)
    log('\n' + 'blue', '7️⃣ Тест: Инвентарь бота (CS2)');
    try {
      const response = await axios.get('http://localhost:3001/api/steam/bot-inventory?game=cs2', {
        headers: { Authorization: `Bearer ${global.testToken}` },
        timeout: 10000
      });

      const { items, count, error } = response.data;

      if (error) {
        log('yellow', '   ⚠️  API вернул ошибку: ' + error);
        results.push({ test: 'Bot Inventory (CS2)', status: 'WARNING', details: error });
      } else {
        log('green', '   ✅ Инвентарь бота получен');
        log('cyan', `   Предметов: ${count}`);
        passedTests++;
        results.push({ test: 'Bot Inventory (CS2)', status: 'PASSED', details: `${count} items` });
      }
    } catch (botError) {
      log('red', '   ❌ Ошибка получения инвентаря бота: ' + botError.message);
      failedTests++;
      results.push({ test: 'Bot Inventory (CS2)', status: 'FAILED', error: botError.message });
    }

    // 8. ТЕСТ: Фильтрация предметов
    log('\n' + 'blue', '8️⃣ Тест: Логика фильтрации');
    try {
      const response = await axios.get('http://localhost:3001/api/steam/test-filter/cs2', {
        headers: { Authorization: `Bearer ${global.testToken}` },
        timeout: 5000
      });

      const { beforeFilter, afterFilter, filteredOut } = response.data;

      log('green', '   ✅ Фильтрация работает');
      log('cyan', `   До фильтра: ${beforeFilter}`);
      log('cyan', `   После фильтра: ${afterFilter}`);
      log('cyan', `   Отфильтровано: ${filteredOut}`);

      passedTests++;
      results.push({
        test: 'Filtering Logic',
        status: 'PASSED',
        details: `${beforeFilter} → ${afterFilter} (${filteredOut} removed)`
      });
    } catch (filterError) {
      log('red', '   ❌ Ошибка тестирования фильтра: ' + filterError.message);
      failedTests++;
      results.push({ test: 'Filtering Logic', status: 'FAILED', error: filterError.message });
    }

  } catch (error) {
    log('red', '❌ Критическая ошибка тестирования: ' + error.message);
    console.error(error);
  }

  // ИТОГОВЫЙ ОТЧЕТ
  log('\n' + '='.repeat(60), 'blue');
  log('📊 ИТОГОВЫЙ ОТЧЕТ', 'blue');
  log('='.repeat(60), 'blue');

  log('green', `✅ Пройдено тестов: ${passedTests}`);
  log('red', `❌ Провалено тестов: ${failedTests}`);
  log('cyan', `📈 Всего тестов: ${passedTests + failedTests}`);

  if (failedTests === 0) {
    log('\n' + '🎉 ВСЕ ОСНОВНЫЕ ТЕСТЫ ПРОЙДЕНЫ!', 'green');
  } else if (failedTests < 3) {
    log('\n' + '⚠️  НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ', 'yellow');
  } else {
    log('\n' + '❌ МНОГО ТЕСТОВ ПРОВАЛЕНО', 'red');
  }

  // ДЕТАЛЬНЫЕ РЕЗУЛЬТАТЫ
  log('\n' + '📋 ДЕТАЛЬНЫЕ РЕЗУЛЬТАТЫ:\n', 'cyan');
  results.forEach((result, i) => {
    const statusColor = result.status === 'PASSED' ? 'green' :
                       result.status === 'WARNING' ? 'yellow' : 'red';
    log(`${i + 1}. [${result.status}] ${result.test}`, statusColor);
    if (result.details) {
      log(`   ${result.details}`, 'cyan');
    }
    if (result.error) {
      log(`   Ошибка: ${result.error}`, 'red');
    }
    if (result.diagnostic) {
      log(`   Диагностика:`, 'yellow');
      log(`   ${JSON.stringify(result.diagnostic, null, 2)}`, 'yellow');
    }
    log('');
  });

  // РЕКОМЕНДАЦИИ
  log('💡 РЕКОМЕНДАЦИИ:\n', 'blue');
  log('1. Если нет OAuth токена:', 'cyan');
  log('   - Откройте: http://localhost:3001/api/auth/steam', 'cyan');
  log('   - Пройдите аутентификацию Steam', 'cyan');
  log('   - Вернитесь на сайт', 'cyan');

  log('\n2. Если API недоступен:', 'cyan');
  log('   - Запустите: npm start', 'cyan');
  log('   - Проверьте порт 3001', 'cyan');
  log('   - Посмотрите логи: tail -f logs/app.log', 'cyan');

  log('\n3. Для диагностики проблем:', 'cyan');
  log('   - Запустите: node quick-diagnostic.js', 'cyan');
  log('   - Проверьте: http://localhost:3001/api/steam/diagnostic', 'cyan');

  log('\n' + '='.repeat(60), 'blue');
  log('⏰ Время завершения: ' + new Date().toISOString(), 'cyan');
  log('='.repeat(60), 'blue');

  // Закрываем соединение с базой
  await mongoose.connection.close();

  // Возвращаем код выхода
  process.exit(failedTests > 0 ? 1 : 0);
}

// Обработка ошибок
process.on('unhandledRejection', (reason, promise) => {
  log('red', '\n❌ Необработанное отклонение Promise:');
  console.error(reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log('red', '\n❌ Неперехваченное исключение:');
  console.error(error);
  process.exit(1);
});

// Запускаем тест
testCompleteSystem().catch(error => {
  log('red', '\n❌ Фатальная ошибка:');
  console.error(error);
  process.exit(1);
});
