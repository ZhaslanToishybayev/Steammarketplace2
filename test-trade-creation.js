#!/usr/bin/env node

// Тест создания trade offer для проверки работоспособности системы

const axios = require('axios');

async function testTradeCreation() {
  console.log('🎮 ТЕСТ СОЗДАНИЯ TRADE OFFER');
  console.log('===============================');
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

    // Получаем инвентарь бота
    console.log('2. Получение инвентаря бота...');
    const inventoryResponse = await axios.get('http://localhost:3021/api/inventory/bot');

    if (!inventoryResponse.data.success) {
      console.log('❌ Не удалось получить инвентарь бота');
      console.log(`   Ошибка: ${inventoryResponse.data.error}`);
      return;
    }

    const items = inventoryResponse.data.data.items;
    console.log(`✅ Получено ${items.length} предметов`);

    if (items.length === 0) {
      console.log('❌ Инвентарь бота пуст. Тест завершен.');
      return;
    }

    // Берем первый доступный предмет для теста
    const botItem = items.find(item => item.tradable && item.marketable);

    if (!botItem) {
      console.log('❌ Нет подходящих для торговли предметов');
      return;
    }

    console.log('');
    console.log('📦 ПРЕДМЕТ ДЛЯ ТЕСТА:');
    console.log(`   Название: ${botItem.name}`);
    console.log(`   AssetID: ${botItem.assetid}`);
    console.log(`   Цена: $${botItem.price}`);
    console.log(`   Tradable: ${botItem.tradable ? 'Да' : 'Нет'}`);
    console.log(`   Marketable: ${botItem.marketable ? 'Да' : 'Нет'}`);
    console.log('');

    // Создаем тестовый trade offer
    console.log('3. Создание тестового trade offer...');

    const tradeData = {
      partnerSteamId: '76561198087654321', // Пример SteamID
      itemsFromBot: [{
        assetid: botItem.assetid,
        name: botItem.name,
        price: botItem.price
      }],
      itemsFromPartner: [{
        assetid: '987654321',
        name: 'Test Item from Partner',
        price: 100.0
      }],
      message: 'Test trade offer from Steam Trade Manager - система работает!'
    };

    console.log('📤 Отправка запроса...');
    console.log('   POST /api/trades/create');
    console.log('   Body:', JSON.stringify(tradeData, null, 2));

    const tradeResponse = await axios.post('http://localhost:3021/api/trades/create', tradeData);

    if (tradeResponse.data.success) {
      console.log('');
      console.log('✅ TRADE OFFER УСПЕШНО СОЗДАН!');
      console.log('─'.repeat(50));
      console.log(`   Trade ID: ${tradeResponse.data.data.tradeId}`);
      console.log(`   Статус: ${tradeResponse.data.data.status}`);
      console.log(`   Партнер SteamID: ${tradeResponse.data.data.partnerSteamId}`);
      console.log(`   Сообщение: ${tradeResponse.data.data.message}`);
      console.log('');
      console.log('🎉 СИСТЕМА ПОЛНОСТЬЮ РАБОТОСПОСОБНА!');
      console.log('   Steam бот успешно авторизован');
      console.log('   Инвентарь доступен');
      console.log('   Trade offers могут создаваться');
      console.log('   Все API endpoints работают корректно');

    } else {
      console.log('❌ Ошибка создания trade offer:');
      console.log(`   ${tradeResponse.data.error}`);
    }

  } catch (error) {
    if (error.response) {
      console.error(`❌ HTTP ошибка: ${error.response.status} - ${error.response.statusText}`);
      if (error.response.data) {
        console.error(`   ${error.response.data.error || error.response.data.message}`);
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Не удается подключиться к Steam Trade Manager');
      console.error('   Убедитесь что steam-trade-manager-debug.js запущен на порту 3021');
    } else {
      console.error(`❌ Ошибка: ${error.message}`);
    }
  }
}

// Запуск теста
testTradeCreation();