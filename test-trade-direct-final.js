#!/usr/bin/env node

// Final test for trade offer creation with corrected properties

const axios = require('axios');

async function testTradeCreation() {
  console.log('🎮 ФИНАЛЬНЫЙ ТЕСТ СОЗДАНИЯ TRADE OFFER');
  console.log('==========================================');
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

    // Создаем trade offer с корректными данными
    console.log('3. Создание trade offer для AUG | Dvornik...');
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
      message: 'Trade offer from Steam bot - ваш AUG предмет готов!'
    };

    console.log('📤 Отправка запроса...');
    console.log('   POST /api/trades/create');
    console.log('   Body:', JSON.stringify(tradeData, null, 2));

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
      console.log(`   Бот получает: ${tradeResponse.data.data.itemsFromPartner.length === 0 ? 'Ничего (подарок)' : tradeResponse.data.data.itemsFromPartner[0]?.name}`);
      console.log(`   Сообщение: ${tradeResponse.data.data.message}`);
      console.log('');
      console.log('🎉 ТОРГОВОЕ ПРЕДЛОЖЕНИЕ УСПЕШНО ОТПРАВЛЕНО!');
      console.log('   Теперь нужно подтвердить трейд через Steam Mobile Authenticator');
      console.log('   Проверьте мобильное приложение Steam для подтверждения');
    } else {
      console.log('❌ Ошибка создания trade offer:');
      console.log(`   ${tradeResponse.data.error}`);
      if (tradeResponse.data.details) {
        console.log(`   Детали: ${tradeResponse.data.details}`);
      }
    }

  } catch (error) {
    console.log('');

    if (error.response) {
      console.error(`❌ HTTP ошибка: ${error.response.status} - ${error.response.statusText}`);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Не удается подключиться к Steam Trade Manager');
      console.error('   Убедитесь что steam-trade-manager-debug.js запущен на порту 3021');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('❌ Таймаут запроса - возможно проблема с Steam API');
    } else {
      console.error(`❌ Ошибка: ${error.message}`);
    }
  }
}

// Запуск теста
testTradeCreation();