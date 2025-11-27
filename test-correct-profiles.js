#!/usr/bin/env node

const axios = require('axios');

async function testCorrectProfiles() {
  console.log('🎮 ТЕСТ ПРОФИЛЕЙ С ПРАВИЛЬНЫМИ SteamID');
  console.log('==========================================');
  console.log('');

  try {
    // Проверяем оба профиля с правильными SteamID
    console.log('🔍 Проверка профилей Steam:');
    console.log('');

    // Правильный бот (Sgovt1)
    console.log('🤖 Проверка бота (Sgovt1):');
    const botResponse = await axios.get(
      'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=E1FC69B3707FF57C6267322B0271A86B&steamids=76561198782060203'
    );

    const botPlayer = botResponse.data.response.players[0];
    const botVisibility = botPlayer.communityvisibilitystate;

    console.log(`   SteamID: ${botPlayer.steamid}`);
    console.log(`   Имя: ${botPlayer.personaname}`);
    console.log(`   Видимость: ${botVisibility === 3 ? 'ПУБЛИЧНЫЙ ✅' : 'ПРИВАТНЫЙ ❌'}`);
    console.log(`   communityvisibilitystate: ${botVisibility}`);
    console.log('');

    // Клиент (правильный аккаунт)
    console.log('👤 Проверка клиента:');
    const clientResponse = await axios.get(
      'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=E1FC69B3707FF57C6267322B0271A86B&steamids=76561199257487454'
    );

    const clientPlayer = clientResponse.data.response.players[0];
    const clientVisibility = clientPlayer.communityvisibilitystate;

    console.log(`   SteamID: ${clientPlayer.steamid}`);
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
      console.log('   Steam требует публичные профили для trade offers.');
      console.log('');

      // Проверим инвентарь бота
      console.log('🎁 Проверка инвентаря бота:');
      try {
        const inventoryResponse = await axios.get(
          `http://localhost:3021/api/inventory/bot`,
          { timeout: 10000 }
        );

        if (inventoryResponse.data.success && inventoryResponse.data.data.items.length > 0) {
          console.log(`   ✅ Инвентарь бота доступен: ${inventoryResponse.data.data.items.length} предметов`);
          const augItem = inventoryResponse.data.data.items.find(item =>
            item.name && item.name.includes('AUG')
          );

          if (augItem) {
            console.log(`   🎯 Найден AUG предмет: ${augItem.name}`);
            console.log(`   🆔 AssetID: ${augItem.assetid}`);
          } else {
            console.log('   ❌ AUG предмет не найден в инвентаре');
          }
        } else {
          console.log('   ❌ Инвентарь бота недоступен');
        }
      } catch (inventoryError) {
        console.log('   ❌ Ошибка доступа к инвентарю бота:', inventoryError.message);
      }

      console.log('');
      console.log('🚀 ТЕПЕРЬ ПОПРОБУЕМ СОЗДАТЬ TRADE OFFER:');
      console.log('==========================================');

      // Проверим статус бота
      try {
        const statusResponse = await axios.get(
          'http://localhost:3021/api/account/status',
          { timeout: 10000 }
        );

        if (statusResponse.data.data.botStatus === 'online') {
          console.log('✅ Бот онлайн и готов к работе');
          console.log(`   SteamID: ${statusResponse.data.data.steamId}`);
          console.log(`   Phase: ${statusResponse.data.data.debugInfo.currentPhase}`);
          console.log('');

          // Попробуем создать trade offer
          await attemptTradeOffer();
        } else {
          console.log('❌ Бот не онлайн');
        }
      } catch (statusError) {
        console.log('❌ Ошибка проверки статуса бота:', statusError.message);
      }

    } else {
      console.log('❌ Есть проблемы с видимостью профилей:');
      if (botVisibility !== 3) {
        console.log('   - Бот имеет приватный профиль');
        console.log('   - Решение: Сделайте профиль бота публичным');
        console.log('   - https://steamcommunity.com/profiles/76561198782060203/edit');
      }
      if (clientVisibility !== 3) {
        console.log('   - Клиент имеет приватный профиль');
        console.log('   - Решение: Сделайте профиль клиента публичным');
        console.log('   - https://steamcommunity.com/profiles/76561199257487454/edit');
      }
    }

  } catch (error) {
    console.error('❌ Ошибка проверки профилей:', error.message);
  }
}

async function attemptTradeOffer() {
  console.log('🔄 ПОПЫТКА СОЗДАНИЯ TRADE OFFER');
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
      message: 'PRO Trade: AUG | Dvornik (Battle-Scarred) → 76561199257487454 [Correct Profiles Test]'
    };

    console.log('📤 Отправка trade offer...');
    console.log(`   Бот SteamID: 76561198782060203 (Sgovt1 - ПУБЛИЧНЫЙ)`);
    console.log(`   Клиент SteamID: 76561199257487454 (ПУБЛИЧНЫЙ)`);
    console.log(`   Предмет: ${tradeData.itemsFromBot[0].name}`);
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
      console.log('');
      console.log('✅ PROFIT! Трейд успешно отправлен на ваш Steam аккаунт!');
    } else {
      console.log('❌ Trade offer не удался:');
      console.log(`   Ошибка: ${response.data.error}`);
      if (response.data.details) {
        console.log(`   Детали: ${response.data.details}`);
      }

      // Анализируем типичные ошибки Steam
      if (response.data.error && response.data.error.includes('15')) {
        console.log('');
        console.log('🔒 Steam API Error 15: AccessDenied');
        console.log('💡 Это Steam платформенное ограничение, а не ошибка кода!');
        console.log('');
        console.log('🚨 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
        console.log('   1. Профили недавно стали публичными (подождите 15-30 минут)');
        console.log('   2. Нужно добавить бота в друзья');
        console.log('   3. Требуется Trade Offer Access Token');
        console.log('   4. SteamGuard ограничения');
        console.log('');
        console.log('🎯 РЕШЕНИЯ (CS.MONEY-style):');
        console.log('   1. Убедитесь, что оба профиля публичные (мы это проверили!)');
        console.log('   2. Подождите 30 минут после смены приватности');
        console.log('   3. Добавьте бота Sgovt1 в друзья на клиентском аккаунте');
        console.log('   4. Используйте Trade Offer Access Token');
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

    // Дополнительный анализ ошибок
    if (tradeError.message && tradeError.message.includes('timeout')) {
      console.log('');
      console.log('⏰ Таймаут соединения - возможно проблемы с сетью или Steam API');
    }
  }
}

// Запуск теста
testCorrectProfiles().catch(console.error);