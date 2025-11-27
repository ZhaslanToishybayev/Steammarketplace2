#!/usr/bin/env node

// Прямой тест создания trade offer для AUG | Дворник

const axios = require('axios');

async function testTradeCreationDirect() {
  console.log('🎮 ПРЯМОЙ ТЕСТ СОЗДАНИЯ TRADE OFFER ДЛЯ AUG | ДВОРНИК');
  console.log('=====================================================');
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

    // Создаем trade offer
    console.log('2. Создание trade offer для AUG | Дворник...');
    console.log('');

    const tradeData = {
      partnerSteamId: '76561199257487454',
      itemsFromBot: [{
        assetid: '47116182310',
        name: 'AUG | Dvornik (Battle-Scarred)',
        price: 225.54
      }],
      itemsFromPartner: [],
      message: 'Trade offer from Steam bot - your AUG item is ready!'
    };

    console.log('📤 Отправка запроса...');
    console.log('   POST /api/trades/create');
    console.log('   Body:', JSON.stringify(tradeData));

    // Use POST with proper headers
    const tradeResponse = await axios.post('http://localhost:3021/api/trades/create', tradeData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

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
testTradeCreationDirect();