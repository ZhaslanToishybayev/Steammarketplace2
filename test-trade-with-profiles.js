#!/usr/bin/env node

const axios = require('axios');

async function testUpdatedTrade() {
  console.log('🎮 ТЕСТИРОВАНИЕ ТОРГОВЛИ С ОБНОВЛЕННЫМИ ПРОФИЛЯМИ');
  console.log('=====================================================');
  console.log('');

  try {
    // Проверяем оба профиля напрямую
    console.log('🔍 Проверка профилей Steam:');
    console.log('');

    // Проверка клиента
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

    // Проверка бота
    const botResponse = await axios.get(
      'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=E1FC69B3707FF57C6267322B0271A86B&steamids=76561198012345678'
    );

    const botPlayer = botResponse.data.response.players[0];
    const botVisibility = botPlayer.communityvisibilitystate;

    console.log(`🤖 Бот аккаунт (76561198012345678):`);
    console.log(`   Имя: ${botPlayer.personaname}`);
    console.log(`   Видимость: ${botVisibility === 3 ? 'ПУБЛИЧНЫЙ ✅' : 'ПРИВАТНЫЙ ❌'}`);
    console.log(`   communityvisibilitystate: ${botVisibility}`);
    console.log('');

    // Анализ ситуации
    console.log('📊 АНАЛИЗ СИТУАЦИИ:');
    console.log('');

    if (clientVisibility === 3 && botVisibility === 3) {
      console.log('🎉 ОТЛИЧНО! Оба аккаунта публичные!');
      console.log('   Это идеальные условия для торговли без ограничений.');
      console.log('');
      await attemptTrade('both_public');
    } else if (clientVisibility === 3 && botVisibility !== 3) {
      console.log('⚠️  Клиент публичный, но бот приватный.');
      console.log('   Решение: Сделайте профиль бота публичным');
      console.log('   https://steamcommunity.com/profiles/76561198012345678/edit');
    } else if (clientVisibility !== 3 && botVisibility === 3) {
      console.log('⚠️  Бот публичный, но клиент приватный.');
      console.log('   Решение: Сделайте профиль клиента публичным');
      console.log('   https://steamcommunity.com/profiles/76561199257487454/edit');
    } else {
      console.log('❌ Оба аккаунта приватные.');
      console.log('   Решение: Сделайте оба профиля публичными');
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
testUpdatedTrade().catch(console.error);