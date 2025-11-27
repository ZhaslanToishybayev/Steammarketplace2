#!/usr/bin/env node

const axios = require('axios');

async function deepSteamAnalysis() {
  console.log('🔍 ГЛУБОКИЙ АНАЛИЗ STEAM ОГРАНИЧЕНИЙ');
  console.log('==========================================');
  console.log('');

  try {
    // 1. Проверим детали профилей
    console.log('📊 ДЕТАЛЬНАЯ ПРОВЕРКА ПРОФИЛЕЙ:');
    console.log('');

    // Бот
    const botResponse = await axios.get(
      'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=E1FC69B3707FF57C6267322B0271A86B&steamids=76561198782060203'
    );

    const botPlayer = botResponse.data.response.players[0];
    console.log('🤖 Бот (Sgovt1):');
    console.log(`   SteamID: ${botPlayer.steamid}`);
    console.log(`   Имя: ${botPlayer.personaname}`);
    console.log(`   Видимость: ${botPlayer.communityvisibilitystate === 3 ? 'ПУБЛИЧНЫЙ ✅' : 'ПРИВАТНЫЙ ❌'}`);
    console.log(`   communityvisibilitystate: ${botPlayer.communityvisibilitystate}`);
    console.log(`   profilestate: ${botPlayer.profilestate || 'unknown'}`);
    console.log(`   personastate: ${botPlayer.personastate || 'unknown'}`);
    console.log(`   lastlogoff: ${botPlayer.lastlogoff ? new Date(botPlayer.lastlogoff * 1000).toISOString() : 'unknown'}`);
    console.log('');

    // Клиент
    const clientResponse = await axios.get(
      'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=E1FC69B3707FF57C6267322B0271A86B&steamids=76561199257487454'
    );

    const clientPlayer = clientResponse.data.response.players[0];
    console.log('👤 Клиент:');
    console.log(`   SteamID: ${clientPlayer.steamid}`);
    console.log(`   Имя: ${clientPlayer.personaname}`);
    console.log(`   Видимость: ${clientPlayer.communityvisibilitystate === 3 ? 'ПУБЛИЧНЫЙ ✅' : 'ПРИВАТНЫЙ ❌'}`);
    console.log(`   communityvisibilitystate: ${clientPlayer.communityvisibilitystate}`);
    console.log(`   profilestate: ${clientPlayer.profilestate || 'unknown'}`);
    console.log(`   personastate: ${clientPlayer.personastate || 'unknown'}`);
    console.log(`   lastlogoff: ${clientPlayer.lastlogoff ? new Date(clientPlayer.lastlogoff * 1000).toISOString() : 'unknown'}`);
    console.log('');

    // 2. Проверим ограничения Steam Guard
    console.log('🛡️ ПРОВЕРКА STEAM GUARD ОГРАНИЧЕНИЙ:');
    console.log('');

    // Проверим возраст аккаунтов
    const botCreated = botPlayer.timecreated ? new Date(botPlayer.timecreated * 1000) : null;
    const clientCreated = clientPlayer.timecreated ? new Date(clientPlayer.timecreated * 1000) : null;

    console.log('📅 ДАТЫ СОЗДАНИЯ АККАУНТОВ:');
    if (botCreated) {
      const botAgeDays = (Date.now() - botCreated.getTime()) / (1000 * 60 * 60 * 24);
      console.log(`   Бот: ${botCreated.toISOString().split('T')[0]} (возраст: ${botAgeDays.toFixed(1)} дней)`);
    } else {
      console.log(`   Бот: дата неизвестна`);
    }

    if (clientCreated) {
      const clientAgeDays = (Date.now() - clientCreated.getTime()) / (1000 * 60 * 60 * 24);
      console.log(`   Клиент: ${clientCreated.toISOString().split('T')[0]} (возраст: ${clientAgeDays.toFixed(1)} дней)`);
    } else {
      console.log(`   Клиент: дата неизвестна`);
    }
    console.log('');

    // 3. Проверим мобильный аутентификатор
    console.log('📱 МОБИЛЬНЫЙ АУТЕНТИФИКАТОР:');
    console.log('   Бот: Используется Steam Guard Mobile Authenticator');
    console.log('   Steam требует 15+ дней после активации мобильного аутентификатора');
    console.log('');

    // 4. Проверим статус бота
    console.log('🤖 ПРОВЕРКА СОСТОЯНИЯ БОТА:');
    try {
      const statusResponse = await axios.get(
        'http://localhost:3021/api/account/status',
        { timeout: 10000 }
      );

      console.log(`   Статус: ${statusResponse.data.data.botStatus}`);
      console.log(`   SteamID: ${statusResponse.data.data.steamId}`);
      console.log(`   Phase: ${statusResponse.data.data.debugInfo.currentPhase}`);
      console.log(`   Mobile Authenticator: ${statusResponse.data.data.mobileAuthenticator ? 'SET' : 'NOT SET'}`);
      console.log(`   Identity Secret: ${statusResponse.data.data.identitySecret ? 'SET' : 'NOT SET'}`);
      console.log('');
    } catch (statusError) {
      console.log('   ❌ Не удалось проверить статус бота');
    }

    // 5. Анализ возможных причин Error 15
    console.log('🔍 АНАЛИЗ ВОЗМОЖНЫХ ПРИЧИН ERROR 15:');
    console.log('');

    const issues = [];

    // Проверка возраста аккаунтов
    if (botCreated) {
      const botAgeDays = (Date.now() - botCreated.getTime()) / (1000 * 60 * 60 * 24);
      if (botAgeDays < 30) {
        issues.push(`Боту меньше 30 дней (${botAgeDays.toFixed(1)} дней) - Steam может ограничивать молодые аккаунты`);
      }
    }

    if (clientCreated) {
      const clientAgeDays = (Date.now() - clientCreated.getTime()) / (1000 * 60 * 60 * 24);
      if (clientAgeDays < 30) {
        issues.push(`Клиентскому аккаунту меньше 30 дней (${clientAgeDays.toFixed(1)} дней) - Steam может ограничивать молодые аккаунты`);
      }
    }

    // Проверка online статуса
    if (botPlayer.personastate && botPlayer.personastate !== 1) {
      issues.push(`Бот не в Online статусе (personastate: ${botPlayer.personastate})`);
    }

    if (clientPlayer.personastate && clientPlayer.personastate !== 1) {
      issues.push(`Клиент не в Online статусе (personastate: ${clientPlayer.personastate})`);
    }

    if (issues.length > 0) {
      console.log('⚠️  ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    } else {
      console.log('✅ Проблемы не обнаружены. Все параметры в норме.');
    }

    console.log('');
    console.log('🎯 РЕКОМЕНДАЦИИ:');
    console.log('');

    // Конкретные рекомендации
    if (botCreated) {
      const botAgeDays = (Date.now() - botCreated.getTime()) / (1000 * 60 * 60 * 24);
      if (botAgeDays < 90) {
        console.log('   1. Возраст бота меньше 90 дней - это может быть причиной ограничений');
        console.log('   2. Подождите, пока боту исполнится 90+ дней');
        console.log('   3. Или используйте более старый Steam аккаунт для бота');
      }
    }

    console.log('   1. Убедитесь, что оба аккаунта активны (не offline)');
    console.log('   2. Проверьте, нет ли торговых ограничений на аккаунтах');
    console.log('   3. Убедитесь, что mobile authenticator активирован более 15 дней назад');
    console.log('   4. Попробуйте добавить аккаунты в друзья');
    console.log('   5. Проверьте Steam Guard email подтверждения');

    // 6. Тест реального trade offer
    console.log('');
    console.log('🔄 ТЕСТ СОЗДАНИЯ TRADE OFFER:');
    console.log('');

    try {
      const tradeResponse = await axios.post(
        'http://localhost:3021/api/trades/create',
        {
          partnerSteamId: '76561199257487454',
          itemsFromBot: [{
            assetid: '47116182310',
            name: 'AUG | Dvornik (Battle-Scarred)',
            appid: 730,
            contextid: '2'
          }],
          itemsFromPartner: [],
          message: 'Deep Analysis Test - проверка ограничений'
        },
        { timeout: 15000 }
      );

      if (tradeResponse.data.success) {
        console.log('🎉 УСПЕШНО! Trade offer создан!');
        console.log(`   Trade ID: ${tradeResponse.data.data.tradeId}`);
      } else {
        console.log('❌ Trade offer не удался:');
        console.log(`   Ошибка: ${tradeResponse.data.error}`);
        console.log(`   Steam Error: ${tradeResponse.data.steamError || 'Unknown'}`);

        // Дополнительный анализ
        if (tradeResponse.data.details) {
          console.log(`   Детали: ${tradeResponse.data.details}`);
        }

        // Проверим типичные коды ошибок
        if (tradeResponse.data.error && tradeResponse.data.error.includes('15')) {
          console.log('');
          console.log('🔒 Steam API Error 15: AccessDenied');
          console.log('   Это может быть вызвано:');
          console.log('   - Возрастом аккаунтов');
          console.log('   - Ограничениями Steam Guard');
          console.log('   - Требованием дружбы между аккаунтами');
          console.log('   - Региональными ограничениями');
        }
      }
    } catch (tradeError) {
      console.log('❌ Ошибка создания trade offer:');
      if (tradeError.response) {
        console.log(`   HTTP: ${tradeError.response.status} - ${tradeError.response.statusText}`);
        if (tradeError.response.data) {
          console.log(`   Тело: ${JSON.stringify(tradeError.response.data, null, 2)}`);
        }
      } else {
        console.log(`   Ошибка: ${tradeError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка анализа:', error.message);
  }
}

// Запуск анализа
deepSteamAnalysis().catch(console.error);