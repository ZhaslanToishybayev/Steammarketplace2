#!/usr/bin/env node

const axios = require('axios');

async function steamTradeOptimization() {
  console.log('🚀 ОПТИМИЗАЦИЯ STEAM TRADE OFFER');
  console.log('=====================================');
  console.log('');

  try {
    // Шаг 1: Проверка статуса бота
    console.log('1. Проверка статуса бота...');
    const statusResponse = await axios.get('http://localhost:3021/api/account/status');
    console.log(`✅ Бот статус: ${statusResponse.data.data.botStatus}`);
    console.log(`   SteamID: ${statusResponse.data.data.steamId}`);
    console.log(`   Фаза: ${statusResponse.data.data.debugInfo.currentPhase}`);
    console.log('');

    // Шаг 2: Проверка профиля получателя
    console.log('2. Проверка профиля получателя...');
    const profileResponse = await axios.get(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=E1FC69B3707FF57C6267322B0271A86B&steamids=76561199257487454`
    );

    if (profileResponse.data.response && profileResponse.data.response.players) {
      const player = profileResponse.data.response.players[0];
      console.log(`✅ Профиль получателя:`);
      console.log(`   Имя: ${player.personaname || 'Unknown'}`);
      console.log(`   Статус: ${player.personastate || 'Unknown'}`);
      console.log(`   Видимость: ${player.communityvisibilitystate || 'Unknown'}`);
      console.log(`   Профиль публичный: ${player.communityvisibilitystate === 3 ? 'ДА' : 'НЕТ'}`);
      console.log('');
    }

    // Шаг 3: Проверка инвентаря бота
    console.log('3. Проверка инвентаря бота...');
    const inventoryResponse = await axios.get('http://localhost:3021/api/inventory/bot');
    const items = inventoryResponse.data.data.items;
    console.log(`✅ Инвентарь: ${items.length} предметов`);
    if (items.length > 0) {
      console.log(`   Доступный предмет: ${items[0].name} (AssetID: ${items[0].assetid})`);
    }
    console.log('');

    // Шаг 4: Оптимизированная стратегия создания trade offer
    console.log('4. Создание оптимизированного trade offer...');

    // Стратегия 1: Минимальный trade offer
    console.log('   📋 Стратегия 1: Минимальный trade offer (только дарим)');
    const minimalTradeData = {
      partnerSteamId: '76561199257487454',
      itemsFromBot: [{
        assetid: '47116182310',
        name: 'AUG | Dvornik (Battle-Scarred)',
        appid: 730,
        contextid: '2'
      }],
      itemsFromPartner: [], // Ничего не требуем
      message: 'Gift from Steam bot - test'
    };

    console.log('📤 Отправка минимального trade offer...');
    try {
      const minimalResponse = await axios.post(
        'http://localhost:3021/api/trades/create',
        minimalTradeData,
        { timeout: 15000 }
      );

      if (minimalResponse.data.success) {
        console.log('✅ УСПЕШНО! Минимальный trade offer создан!');
        console.log(`   Trade ID: ${minimalResponse.data.data.tradeId}`);
        console.log(`   Статус: ${minimalResponse.data.data.status}`);
        return;
      }
    } catch (minError) {
      console.log('❌ Минимальный trade offer не удался');
      if (minError.response?.data?.details) {
        console.log(`   Ошибка: ${minError.response.data.details}`);
      }
    }

    // Стратегия 2: Trade offer без сообщения
    console.log('');
    console.log('   📋 Стратегия 2: Trade offer без сообщения');
    const silentTradeData = {
      partnerSteamId: '76561199257487454',
      itemsFromBot: [{
        assetid: '47116182310',
        name: 'AUG | Dvornik (Battle-Scarred)',
        appid: 730,
        contextid: '2'
      }],
      itemsFromPartner: [],
      message: '' // Без сообщения
    };

    console.log('📤 Отправка silent trade offer...');
    try {
      const silentResponse = await axios.post(
        'http://localhost:3021/api/trades/create',
        silentTradeData,
        { timeout: 15000 }
      );

      if (silentResponse.data.success) {
        console.log('✅ УСПЕШНО! Silent trade offer создан!');
        console.log(`   Trade ID: ${silentResponse.data.data.tradeId}`);
        console.log(`   Статус: ${silentResponse.data.data.status}`);
        return;
      }
    } catch (silentError) {
      console.log('❌ Silent trade offer не удался');
      if (silentError.response?.data?.details) {
        console.log(`   Ошибка: ${silentError.response.data.details}`);
      }
    }

    // Стратегия 3: Пустой trade offer (тест на доступность)
    console.log('');
    console.log('   📋 Стратегия 3: Пустой trade offer (тест)');
    const emptyTradeData = {
      partnerSteamId: '76561199257487454',
      itemsFromBot: [],
      itemsFromPartner: [],
      message: 'Test empty offer'
    };

    console.log('📤 Отправка пустого trade offer...');
    try {
      const emptyResponse = await axios.post(
        'http://localhost:3021/api/trades/create',
        emptyTradeData,
        { timeout: 15000 }
      );

      if (emptyResponse.data.success) {
        console.log('✅ Пустой trade offer успешен! Проблема не в доступности.');
        console.log(`   Trade ID: ${emptyResponse.data.data.tradeId}`);
      } else {
        console.log('❌ Даже пустой trade offer не удался - серьезные ограничения');
      }
    } catch (emptyError) {
      console.log('❌ Пустой trade offer не удался');
      if (emptyError.response?.data?.details) {
        console.log(`   Ошибка: ${emptyError.response.data.details}`);
      }
    }

    console.log('');
    console.log('🔍 АНАЛИЗ ОШИБОК:');
    console.log('Если все стратегии не удались, проблема в одном из:');
    console.log('1. Профиль получателя приватный');
    console.log('2. Steam Guard ограничения (менее 15 дней)');
    console.log('3. Торговые ограничения на одном из аккаунтов');
    console.log('4. Аккаунты не в друзьях');
    console.log('5. Rate limiting от Steam');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    if (error.code) {
      console.error(`   Код ошибки: ${error.code}`);
    }
  }
}

// Запуск оптимизации
steamTradeOptimization();