#!/usr/bin/env node

const axios = require('axios');

async function testCorrectTrade() {
  console.log('🎮 ТЕСТ ТОРГОВЛИ С ПРАВИЛЬНЫМИ STEAMID');
  console.log('==========================================');
  console.log('');

  try {
    // Проверяем оба профиля с правильными SteamID
    console.log('🔍 Проверка профилей Steam:');
    console.log('');

    // Правильный бот
    const botResponse = await axios.get(
      'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=E1FC69B3707FF57C6267322B0271A86B&steamids=76561198782060203'
    );

    const botPlayer = botResponse.data.response.players[0];
    const botVisibility = botPlayer.communityvisibilitystate;

    console.log(`🤖 Правильный бот аккаунт (76561198782060203):`);
    console.log(`   Имя: ${botPlayer.personaname}`);
    console.log(`   Видимость: ${botVisibility === 3 ? 'ПУБЛИЧНЫЙ ✅' : 'ПРИВАТНЫЙ ❌'}`);
    console.log(`   communityvisibilitystate: ${botVisibility}`);
    console.log('');

    // Клиент
    const clientResponse = await axios.get(
      'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=E1FC69B3707FF57C6267322B0271A86B&steamids=76561199257487454'
    );

    const clientPlayer = clientResponse.data.response.players[0];
    const clientVisibility = clientPlayer.communityvisibilitystate;

    console.log(`👤 Клиентский аккаунт (76561199257487454):`);
    console.log(`   Имя: ${clientPlayer.personaname}`);
    console.log(`   Видимость: ${clientVisibility === 3 ? 'ПУБЛИЧНЫЙ ✅' : 'ПРИВАТНЫЙ ❌'}`);
    console.log(`   communityvisibilitystate: ${clientVisibility}`);
    console.log('');

    // Анализ ситуации
    console.log('📊 АНАЛИЗ СИТУАЦИИ:');
    console.log('');

    if (botVisibility === 3 && clientVisibility === 3) {
      console.log('🎉 ОТЛИЧНО! Оба аккаунта публичные!');
      console.log('   Это идеальные условия для торговли без ограничений.');
      console.log('');
      await attemptTrade('both_public_correct_ids');
    } else {
      console.log('❌ Есть проблемы с видимостью профилей');
    }

  } catch (error) {
    console.error('❌ Ошибка проверки профилей:', error.message);
  }
}

async function attemptTrade(strategy) {
  console.log('🚀 ПОПЫТКА СОЗДАНИЯ TRADE OFFER');
  console.log('====================================');
  console.log('');

  try {
    const tradeData = {
      partnerSteamId: '76561199257487454',
      itemsFromBot: [{
        assetid: '47116182310',
        name: 'AUG | Dvornik (Battle-Scarred)',
        appid: 730,
        contextid: '2'
      }],
      itemsFromPartner: [],
      message: `PRO Trade: AUG | Dvornik (Battle-Scarred) → 76561199257487454 [${strategy}]`
    };

    console.log('📤 Отправка trade offer...');
    console.log(`   Стратегия: ${strategy}`);
    console.log(`   Бот SteamID: 76561198782060203`);
    console.log(`   Партнер: 76561199257487454`);
    console.log('');

    const response = await axios.post(
      'http://localhost:3021/api/trades/create',
      tradeData,
      { timeout: 15000 }
    );

    if (response.data.success) {
      console.log('🎉 УСПЕШНО! Trade offer создан!');
      console.log(`   Trade ID: ${response.data.data.tradeId}`);
      console.log(`   Статус: ${response.data.data.status}`);
      console.log(`   Сообщение: ${response.data.data.message}`);
      console.log(`   Бот SteamID: ${response.data.data.partnerSteamId}`);
    } else {
      console.log('❌ Trade offer не удался:');
      console.log(`   Ошибка: ${response.data.error}`);
      if (response.data.details) {
        console.log(`   Детали: ${response.data.details}`);
      }
    }

  } catch (tradeError) {
    console.error('❌ Ошибка создания trade offer:');
    if (tradeError.response) {
      console.error(`   HTTP ошибка: ${tradeError.response.status} - ${tradeError.response.statusText}`);
      if (tradeError.response.data) {
        console.error(`   Тело ответа:`, JSON.stringify(tradeError.response.data, null, 2));
      }
    } else {
      console.error(`   Ошибка: ${tradeError.message}`);
    }
  }
}

// Запуск теста
testCorrectTrade().catch(console.error);