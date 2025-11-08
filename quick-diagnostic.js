#!/usr/bin/env node
/**
 * Быстрая диагностика системы
 * Запускайте при любых проблемах
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

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

async function quickDiagnostic() {
  log('blue', '\n=== 🔍 БЫСТРАЯ ДИАГНОСТИКА СИСТЕМЫ ===\n');

  // 1. Проверка базы данных
  log('cyan', '1. Проверка MongoDB...');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const userCount = await mongoose.connection.db.collection('users').countDocuments();
    log('green', `   ✅ MongoDB подключен. Пользователей: ${userCount}`);

    // Проверить пользователя ENTER
    const User = require('./models/User');
    const user = await User.findOne({ steamId: '76561199257487454' });
    
    if (user) {
      log('cyan', '\n   👤 Пользователь ENTER:');
      log('cyan', `      SteamID: ${user.steamId}`);
      log('cyan', `      OAuth Token: ${user.steamAccessToken ? 'ЕСТЬ' : 'НЕТ'}`);
      log('cyan', `      Inventory Count: ${user.userInventory ? user.userInventory.length : 0}`);
      
      if (!user.steamAccessToken) {
        log('red', '\n   ❌ ПРОБЛЕМА: Нет OAuth токена!');
        log('yellow', '   💡 Решение: Пользователю нужно пройти Steam OAuth аутентификацию');
      }
    } else {
      log('red', '   ❌ Пользователь ENTER не найден!');
    }
  } catch (dbError) {
    log('red', `   ❌ Ошибка MongoDB: ${dbError.message}`);
  }

  // 2. Проверка API
  log('\n' + 'cyan', '2. Проверка API endpoints...');
  try {
    // Проверить диагностический endpoint
    const response = await axios.get('http://localhost:3001/api/steam/diagnostic', { timeout: 5000 });
    log('green', '   ✅ API доступен');
    log('cyan', `   Пользователей в системе: ${response.data.database.userCount}`);
  } catch (apiError) {
    log('red', `   ❌ API недоступен: ${apiError.message}`);
    log('yellow', '   💡 Возможно сервер не запущен. Запустите: npm start');
  }

  // 3. Проверка фильтров
  log('\n' + 'cyan', '3. Проверка логики фильтрации...');
  
  // Симуляция предметов
  const mockItems = [
    { name: 'AK-47 | Redline', appId: 730, type: 'Classified Rifle', tradable: true, marketable: true },
    { name: 'Dota 2 Item', appId: 570, type: 'Dota Item', tradable: true, marketable: true },
    { name: 'CS2 Container', appId: 730, type: 'Base Grade Container', tradable: true, marketable: true }
  ];

  // CS2 фильтр
  const cs2Items = mockItems.filter(item => {
    return item.type &&
           !item.type.includes('Base Grade Container') &&
           !item.type.includes('Graffiti') &&
           !item.type.includes('Music') &&
           item.marketable;
  });

  // Dota 2 фильтр
  const dota2Items = mockItems.filter(item => {
    return item.appId === 570 && item.tradable && item.marketable;
  });

  log('cyan', `   CS2 фильтр: ${mockItems.length} → ${cs2Items.length} предметов`);
  log('cyan', `   Dota 2 фильтр: ${mockItems.length} → ${dota2Items.length} предметов`);

  // Проверить смешивание
  const cs2InDota2 = dota2Items.filter(item => 
    item.type &&
    !item.type.includes('Base Grade Container') &&
    !item.type.includes('Graffiti') &&
    !item.type.includes('Music') &&
    item.marketable
  );

  if (cs2InDota2.length > 0) {
    log('red', '   ❌ ОШИБКА: CS2 предметы попадают в Dota 2!');
  } else {
    log('green', '   ✅ Фильтрация корректна');
  }

  // 4. Рекомендации
  log('\n' + 'blue', '=== 💡 РЕКОМЕНДАЦИИ ===\n');

  log('yellow', 'Если у вас проблемы с инвентарем:');
  log('cyan', '1. Проверьте наличие OAuth токена');
  log('cyan', '2. Запустите: node check-bot-status.js');
  log('cyan', '3. Посмотрите логи: tail -f logs/app.log | grep DIAGNOSTIC');
  log('cyan', '4. Проверьте API: curl http://localhost:3001/api/steam/diagnostic');
  
  log('\n' + 'yellow', 'Для диагностики Dota 2 инвентаря:');
  log('cyan', '1. curl -H "Authorization: Bearer <JWT>" http://localhost:3001/api/steam/inventory?game=dota2');
  log('cyan', '2. Ищите в логах: "Dota 2 Filter Statistics"');
  log('cyan', '3. Проверьте appId предметов - должен быть 570');

  log('\n' + 'green', '✅ Диагностика завершена!\n');
}

quickDiagnostic().catch(e => {
  log('red', '\n❌ Критическая ошибка: ' + e.message);
  console.error(e);
  process.exit(1);
});
