#!/usr/bin/env node

const axios = require('axios');

async function steamRestrictionAnalysis() {
  console.log('🔍 АНАЛИЗ STEAM ОГРАНИЧЕНИЙ');
  console.log('===============================');
  console.log('');

  try {
    // 1. Проверка профиля получателя
    console.log('1. Анализ профиля получателя (76561199257487454)...');
    const profileResponse = await axios.get(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=E1FC69B3707FF57C6267322B0271A86B&steamids=76561199257487454`
    );

    if (profileResponse.data.response?.players?.length > 0) {
      const player = profileResponse.data.response.players[0];
      console.log('✅ Профиль доступен');
      console.log(`   Имя: ${player.personaname || 'Unknown'}`);
      console.log(`   Статус: ${player.personastate || 'Unknown'}`);
      console.log(`   Видимость: ${player.communityvisibilitystate || 'Unknown'}`);

      const visibilityMap = {
        '1': 'Приватный',
        '2': 'Друзья только',
        '3': 'Публичный'
      };
      console.log(`   Тип профиля: ${visibilityMap[player.communityvisibilitystate] || 'Неизвестно'}`);

      if (player.communityvisibilitystate !== '3') {
        console.log('❌ ПРОБЛЕМА: Профиль не публичный - это основная причина AccessDenied');
      } else {
        console.log('✅ Профиль публичный - проблема не в этом');
      }
    } else {
      console.log('❌ Профиль недоступен - серьезные ограничения');
    }
    console.log('');

    // 2. Тест доступности инвентаря
    console.log('2. Тест доступности инвентаря получателя...');
    try {
      const inventoryResponse = await axios.get(
        `https://api.steampowered.com/IEconItems_730/GetPlayerItems/v0001/?key=E1FC69B3707FF57C6267322B0271A86B&steamid=76561199257487454`
      );

      if (inventoryResponse.data.result?.status === 1) {
        console.log('✅ Инвентарь доступен');
        console.log(`   Предметов: ${inventoryResponse.data.result.items?.length || 0}`);
      } else {
        console.log('❌ Инвентарь недоступен - профиль приватный');
      }
    } catch (invError) {
      console.log('❌ Ошибка проверки инвентаря (ожидаемо для приватных профилей)');
    }
    console.log('');

    // 3. Проверка дружбы между аккаунтами
    console.log('3. Проверка дружеских отношений...');
    try {
      const friendsResponse = await axios.get(
        `https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=E1FC69B3707FF57C6267322B0271A86B&steamid=76561198782060203&relationship=friend`
      );

      if (friendsResponse.data.friendslist?.friends) {
        const friends = friendsResponse.data.friendslist.friends;
        const isFriend = friends.some(friend => friend.steamid === '76561199257487454');

        if (isFriend) {
          console.log('✅ Аккаунты в друзьях - это хорошо');
        } else {
          console.log('❌ Аккаунты НЕ в друзьях - возможная причина ограничений');
        }
      }
    } catch (friendError) {
      console.log('❌ Не удалось проверить список друзей');
    }
    console.log('');

    // 4. Проверка статуса бота
    console.log('4. Проверка статуса бота...');
    try {
      const botStatus = await axios.get('http://localhost:3021/api/account/status');
      const botData = botStatus.data.data;

      console.log(`✅ Бот статус: ${botData.botStatus}`);
      console.log(`   SteamID: ${botData.steamId}`);
      console.log(`   Mobile Auth: ${botData.mobileAuthenticator ? '✅' : '❌'}`);
      console.log(`   Identity Secret: ${botData.identitySecret ? '✅' : '❌'}`);
      console.log(`   Phase: ${botData.debugInfo.currentPhase}`);

      if (botData.debugInfo.currentPhase === 'fully_ready') {
        console.log('✅ Бот полностью готов');
      } else {
        console.log('❌ Бот не полностью готов');
      }
    } catch (botError) {
      console.log('❌ Не удалось проверить статус бота');
    }
    console.log('');

    // 5. Рекомендации
    console.log('📋 РЕКОМЕНДАЦИИ:');
    console.log('');

    console.log('🔧 Для решения проблемы AccessDenied:');
    console.log('   1. Сделайте профиль получателя ПУБЛИЧНЫМ');
    console.log('   2. Добавьте аккаунты в друзья');
    console.log('   3. Убедитесь, что мобильный аутентификатор старше 15 дней');
    console.log('   4. Подождите 24 часа после изменений в настройках');
    console.log('');

    console.log('🚀 Альтернативные решения:');
    console.log('   1. Используйте Steam Group Trading');
    console.log('   2. Создайте промежуточный аккаунт-посредник');
    console.log('   3. Используйте Steam Market для продажи');
    console.log('   4. Попробуйте другой целевой аккаунт');
    console.log('');

    console.log('💡 БЫСТРЫЙ ФИКС:');
    console.log('   1. Зайдите в настройки приватности Steam');
    console.log('   2. Установите "Профиль" -> "Публичный"');
    console.log('   3. Добавьте бота в друзья или наоборот');
    console.log('   4. Подождите 15-30 минут');
    console.log('   5. Повторите попытку');

  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error.message);
  }
}

steamRestrictionAnalysis();