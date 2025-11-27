#!/usr/bin/env node

const axios = require('axios');

async function testSimpleTrade() {
  console.log('🎮 ТЕСТИРОВАНИЕ УПРОЩЕННОГО TRADE OFFER');
  console.log('========================================');
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

    // Создаем trade offer с минимальными данными
    console.log('2. Создание упрощенного trade offer (подарок)...');
    console.log('');

    const tradeData = {
      partnerSteamId: '76561199257487454',
      itemsFromBot: [{
        assetid: '47116182310',
        name: 'AUG | Dvornik (Battle-Scarred)',
        appid: 730,
        contextid: '2'
      }],
      itemsFromPartner: [],  // Ничего не требуем взамен
      message: 'Gift from Steam bot - тестовый трейд'
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
      console.log(`   Бот получает: Подарок (ничего)`);
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
testSimpleTrade();
