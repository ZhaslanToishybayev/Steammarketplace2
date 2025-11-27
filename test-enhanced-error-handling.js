#!/usr/bin/env node

const axios = require('axios');

async function testEnhancedErrorHandling() {
  console.log('🎮 ТЕСТИРОВАНИЕ УЛУЧШЕННОЙ ОБРАБОТКИ ОШИБОК');
  console.log('================================================');
  console.log('');

  try {
    // Проверяем статус бота
    console.log('1. Проверка статуса бота...');
    const statusResponse = await axios.get('http://localhost:3021/api/account/status');

    if (statusResponse.data.data.botStatus !== 'online') {
      console.log('❌ Бот не авторизован');
      console.log(`   Текущий статус: ${statusResponse.data.data.botStatus}`);
      return;
    }

    console.log('✅ Бот авторизован');
    console.log(`   SteamID: ${statusResponse.data.data.steamId}`);
    console.log(`   Фаза: ${statusResponse.data.data.debugInfo.currentPhase}`);
    console.log('');

    // Проверяем инвентарь
    console.log('2. Проверка инвентаря бота...');
    const inventoryResponse = await axios.get('http://localhost:3021/api/inventory/bot');

    if (inventoryResponse.data.success && inventoryResponse.data.data.items.length > 0) {
      console.log(`✅ Инвентарь содержит ${inventoryResponse.data.data.items.length} предметов`);
      console.log('   Доступные предметы:');
      inventoryResponse.data.data.items.forEach((item, index) => {
        console.log(`     ${index + 1}. ${item.name} (AssetID: ${item.assetid})`);
      });
      console.log('');
    } else {
      console.log('❌ Инвентарь пуст или недоступен');
      console.log('');
    }

    // Попытка создания trade offer с улучшенной обработкой ошибок
    console.log('3. Тестирование улучшенной обработки ошибок...');
    console.log('');

    const tradeData = {
      partnerSteamId: '76561199257487454',
      itemsFromBot: [{
        assetid: '47116182310',
        name: 'AUG | Dvornik (Battle-Scarred)',
        appid: 730,
        contextid: '2'
      }],
      itemsFromPartner: [],
      message: 'Trade offer test - enhanced error handling'
    };

    console.log('📤 Отправка запроса...');
    console.log('   POST /api/trades/create');

    try {
      const tradeResponse = await axios.post('http://localhost:3021/api/trades/create', tradeData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      console.log('');
      console.log('📊 Ответ сервера:', JSON.stringify(tradeResponse.data, null, 2));

      if (tradeResponse.data.success) {
        console.log('');
        console.log('✅ TRADE OFFER УСПЕШНО СОЗДАН!');
        console.log('─'.repeat(50));
        console.log(`   Trade ID: ${tradeResponse.data.data.tradeId}`);
        console.log(`   Статус: ${tradeResponse.data.data.status}`);
        console.log(`   Партнер SteamID: ${tradeResponse.data.data.partnerSteamId}`);
        console.log(`   Бот дает: ${tradeResponse.data.data.itemsFromBot[0]?.name}`);
        console.log(`   Сообщение: ${tradeResponse.data.data.message}`);
        console.log('');
        console.log('🎉 ТОРГОВОЕ ПРЕДЛОЖЕНИЕ УСПЕШНО ОТПРАВЛЕНО!');
      } else {
        console.log('❌ Ошибка создания trade offer:');
        console.log(`   ${tradeResponse.data.error}`);
        if (tradeResponse.data.details) {
          console.log(`   Детали: ${tradeResponse.data.details}`);
        }
        if (tradeResponse.data.steamError) {
          console.log(`   Steam Error: ${tradeResponse.data.steamError}`);
        }
      }

    } catch (tradeError) {
      console.log('');
      if (tradeError.response) {
        console.error(`❌ HTTP ошибка: ${tradeError.response.status} - ${tradeError.response.statusText}`);
        console.error('   Response:', JSON.stringify(tradeError.response.data, null, 2));

        // Анализируем тип ошибки
        if (tradeError.response.data.steamError === 'AccessDenied') {
          console.log('');
          console.log('🔒 ОБНАРУЖЕНА ОШИБКА Steam API 15: AccessDenied');
          console.log('   Это ограничение платформы Steam, а не ошибка в коде.');
          console.log('   Возможные причины:');
          console.log('   1. Целевой аккаунт имеет приватный профиль');
          console.log('   2. Не выполнены требования мобильного аутентификатора (15+ дней)');
          console.log('   3. Торговые ограничения на одном или обоих аккаунтах');
          console.log('   4. Ограничения на предметы или тайм-ауты');
          console.log('   5. Ограничение по частоте запросов');
          console.log('   6. Аккаунты не в друзьях или профиль приватный');
          console.log('');
          console.log('💡 РЕКОМЕНДАЦИИ:');
          console.log('   - Проверьте настройки приватности целевого аккаунта');
          console.log('   - Убедитесь, что мобильный аутентификатор активен >15 дней');
          console.log('   - Попробуйте отправить предложение на другой аккаунт');
          console.log('   - Проверьте, нет ли торговых банов на аккаунтах');
        }
      } else if (tradeError.code === 'ECONNREFUSED') {
        console.error('❌ Не удается подключиться к Steam Trade Manager');
        console.error('   Убедитесь что steam-trade-manager-debug.js запущен на порту 3021');
      } else if (tradeError.code === 'ETIMEDOUT') {
        console.error('❌ Таймаут запроса - возможно проблема с Steam API');
      } else {
        console.error(`❌ Ошибка: ${tradeError.message}`);
      }
    }

  } catch (error) {
    console.log('');
    console.error('❌ Критическая ошибка:', error.message);
    console.error('❌ Stack:', error.stack);
  }
}

// Запуск теста
testEnhancedErrorHandling();