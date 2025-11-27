#!/usr/bin/env node

// ЗАПРОС РЕАЛЬНОГО ИНВЕНТАРЯ С АККАУНТА

const fetch = require('node-fetch');

async function getRealSteamInventory(steamId) {
  console.log(`🎮 Запрос реального инвентаря для SteamID: ${steamId}`);
  console.log('');

  try {
    // Попробуем несколько вариантов Steam Community Inventory API

    // Вариант 1: Основной инвентарь
    console.log('📡 Попытка 1: Основной Steam Community Inventory API');
    const url1 = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000`;

    const response1 = await fetch(url1, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      }
    });

    console.log(`📊 Статус ответа: ${response1.status}`);

    if (response1.ok) {
      const data1 = await response1.json();

      if (data1.success && data1.assets && data1.assets.length > 0) {
        console.log(`✅ Инвентарь получен! Предметов: ${data1.assets.length}`);
        return processInventoryData(data1);
      } else {
        console.log('❌ Инвентарь пуст или не доступен');
      }
    }

    // Вариант 2: С параметром format=json
    console.log('');
    console.log('📡 Попытка 2: Steam Community Inventory API с format=json');
    const url2 = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000&format=json`;

    const response2 = await fetch(url2, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    console.log(`📊 Статус ответа: ${response2.status}`);

    if (response2.ok) {
      const data2 = await response2.json();

      if (data2.success && data2.assets && data2.assets.length > 0) {
        console.log(`✅ Инвентарь получен! Предметов: ${data2.assets.length}`);
        return processInventoryData(data2);
      } else {
        console.log('❌ Инвентарь пуст или не доступен');
      }
    }

    // Вариант 3: Проверим статус приватности
    console.log('');
    console.log('📡 Попытка 3: Проверка приватности профиля');

    const profileResponse = await fetch(`https://steamcommunity.com/profiles/${steamId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (profileResponse.ok) {
      const profileHtml = await profileResponse.text();

      if (profileHtml.includes('private') || profileHtml.includes('Приватный')) {
        console.log('🔒 Профиль приватный - инвентарь недоступен');
        return {
          success: false,
          error: 'Профиль приватный - инвентарь недоступен',
          reason: 'private_profile'
        };
      } else {
        console.log('👤 Профиль публичный');
      }
    }

    return {
      success: false,
      error: 'Инвентарь недоступен',
      reason: 'inventory_not_accessible'
    };

  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

function processInventoryData(data) {
  console.log('');
  console.log('🎮 ОБРАБОТКА ИНВЕНТАРЯ:');
  console.log('─'.repeat(50));

  // Создаем карту описаний
  const descriptions = {};
  if (data.descriptions) {
    data.descriptions.forEach(desc => {
      descriptions[`${desc.classid}_${desc.instanceid}`] = desc;
    });
  }

  console.log(`📦 Всего предметов: ${data.assets ? data.assets.length : 0}`);
  console.log(`📋 Всего описаний: ${data.descriptions ? data.descriptions.length : 0}`);
  console.log('');

  if (data.assets && data.assets.length > 0) {
    console.log('🎁 СКИНЫ ИЗ ИНВЕНТАРЯ:');
    console.log('─'.repeat(60));

    // Показываем первые 20 предметов
    const itemsToShow = data.assets.slice(0, 20);
    itemsToShow.forEach((asset, index) => {
      const key = `${asset.classid}_${asset.instanceid}`;
      const description = descriptions[key] || {};

      console.log(`${index + 1}. ${description.market_name || `Item ${asset.classid}`}`);
      console.log(`   • ClassID: ${asset.classid}`);
      console.log(`   • InstanceID: ${asset.instanceid}`);
      console.log(`   • AssetID: ${asset.assetid}`);
      console.log(`   • Количество: ${asset.amount || 1}`);
      console.log(`   • Tradable: ${asset.tradable ? 'Да' : 'Нет'}`);
      console.log(`   • Marketable: ${asset.marketable ? 'Да' : 'Нет'}`);

      if (description.type) {
        console.log(`   • Тип: ${description.type}`);
      }
      if (description.rarity?.name) {
        console.log(`   • Редкость: ${description.rarity.name}`);
      }
      if (description.wear) {
        console.log(`   • Износ: ${description.wear}`);
      }
      if (description.icon_url) {
        console.log(`   • Изображение: https://steamcommunity-a.akamaihd.net/economy/itemimages/730/${description.icon_url}.png`);
      }

      console.log('');
    });

    if (data.assets.length > 20) {
      console.log(`... и еще ${data.assets.length - 20} предметов`);
    }
  }

  return {
    success: true,
    data: {
      items: data.assets || [],
      descriptions: data.descriptions || [],
      totalItems: data.assets ? data.assets.length : 0,
      steamId: data.steamid || 'unknown'
    }
  };
}

// Запрос информации об игроке для проверки
async function getPlayerInfo(steamId) {
  console.log('👤 Проверка информации об игроке...');
  console.log('');

  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/` +
      `?key=E1FC69B3707FF57C6267322B0271A86B&steamids=${steamId}`
    );

    const data = await response.json();

    if (data.response && data.response.players && data.response.players.length > 0) {
      const player = data.response.players[0];
      console.log('👤 ИНФОРМАЦИЯ ОБ ИГРОКЕ:');
      console.log('─'.repeat(40));
      console.log(`• SteamID: ${player.steamid}`);
      console.log(`• Personaname: ${player.personaname}`);
      console.log(`• Profile URL: ${player.profileurl}`);
      console.log(`• Personastate: ${player.personastate}`);
      console.log(`• Community Visibility: ${player.communityvisibilitystate}`);
      console.log(`• Profile State: ${player.profilestate}`);
      console.log(`• Time Created: ${player.timecreated ? new Date(player.timecreated * 1000).toISOString() : 'Unknown'}`);

      // Проверяем видимость
      if (player.communityvisibilitystate === 1) {
        console.log('🔒 Профиль полностью приватный');
      } else if (player.communityvisibilitystate === 2) {
        console.log('🔓 Профиль частично публичный');
      } else if (player.communityvisibilitystate === 3) {
        console.log('🌐 Профиль публичный');
      }

      console.log('');
      return player;
    } else {
      console.log('❌ Не удалось получить информацию об игроке');
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка получения информации об игроке:', error.message);
    return null;
  }
}

// Основная функция
async function main() {
  const steamId = '76561198012345678'; // Твой SteamID

  console.log('🎮 ЗАПРОС РЕАЛЬНОГО ИНВЕНТАРЯ С АККАУНТА');
  console.log('===========================================');
  console.log('');

  // Сначала получаем информацию об игроке
  const playerInfo = await getPlayerInfo(steamId);

  if (playerInfo && playerInfo.communityvisibilitystate === 3) {
    // Профиль публичный, пробуем получить инвентарь
    const inventoryResult = await getRealSteamInventory(steamId);

    if (inventoryResult.success) {
      console.log('');
      console.log('🎉 ИНВЕНТАРЬ УСПЕШНО ПОЛУЧЕН!');
    } else {
      console.log('');
      console.log('❌ ИНВЕНТАРЬ НЕДОСТУПЕН:');
      console.log(`   Причина: ${inventoryResult.error}`);

      if (inventoryResult.reason === 'private_profile') {
        console.log('');
        console.log('💡 РЕШЕНИЕ:');
        console.log('   Чтобы получить доступ к инвентарю:');
        console.log('   1. Зайди в настройки приватности Steam');
        console.log('   2. Установи "Инвентарь" на "Публичный"');
        console.log('   3. Повтори запрос');
      }
    }
  } else {
    console.log('');
    console.log('🔒 ПРОФИЛЬ ПРИВАТНЫЙ - ИНВЕНТАРЬ НЕДОСТУПЕН');
    console.log('');
    console.log('💡 РЕШЕНИЕ:');
    console.log('   Чтобы получить доступ к инвентарю:');
    console.log('   1. Зайди в настройки приватности Steam');
    console.log('   2. Установи "Инвентарь" на "Публичный"');
    console.log('   3. Повтори запрос');
  }

  console.log('');
  console.log('🏁 ЗАПРОС ЗАВЕРШЕН');
}

// Запуск
main().catch(console.error);