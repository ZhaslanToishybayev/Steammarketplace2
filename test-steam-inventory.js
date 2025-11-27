#!/usr/bin/env node

const fetch = require('node-fetch');

async function testSteamInventory() {
  console.log('🎮 ПРОВЕРКА STEAM ИНВЕНТАРЯ И БОТА');
  console.log('=====================================');
  console.log('');

  const endpoints = [
    {
      name: 'Steam Bot Status',
      url: 'http://localhost:3013/api/bots/status',
      description: 'Статус Steam бота'
    },
    {
      name: 'Bot Inventory',
      url: 'http://localhost:3013/api/bots/steam_bot_1/inventory',
      description: 'Инвентарь бота'
    },
    {
      name: 'Steam Inventory',
      url: 'http://localhost:3013/api/steam/inventory/76561198012345678',
      description: 'Steam инвентарь'
    },
    {
      name: 'Steam Market',
      url: 'http://localhost:3013/api/steam/market',
      description: 'Steam Market лоты'
    },
    {
      name: 'Bot Trades',
      url: 'http://localhost:3013/api/bots/steam_bot_1/trades',
      description: 'Сделки бота'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Тестируем: ${endpoint.name}`);
      console.log(`🔗 URL: ${endpoint.url}`);
      console.log(`📝 Описание: ${endpoint.description}`);

      const response = await fetch(endpoint.url);
      const data = await response.json();

      if (data.success) {
        console.log(`✅ Статус: УСПЕШНО`);

        if (endpoint.name === 'Steam Bot Status') {
          console.log(`📊 Данные:`, JSON.stringify(data.data, null, 2));
        } else if (endpoint.name === 'Bot Inventory' || endpoint.name === 'Steam Inventory') {
          console.log(`📦 Предметы:`, JSON.stringify(data.data?.items || [], null, 2));
          console.log(`🔢 Всего предметов: ${data.data?.totalItems || data.data?.items?.length || 0}`);
        } else if (endpoint.name === 'Steam Market') {
          console.log(`🛒 Лоты:`, JSON.stringify(data.data, null, 2));
          console.log(`🔢 Всего лотов: ${data.total || data.data?.length || 0}`);
        } else if (endpoint.name === 'Bot Trades') {
          console.log(`🔄 Сделки:`, JSON.stringify(data.data, null, 2));
          console.log(`🔢 Всего сделок: ${data.totalTrades || data.data?.length || 0}`);
        } else {
          console.log(`📊 Ответ:`, JSON.stringify(data, null, 2));
        }
      } else {
        console.log(`❌ Статус: ОШИБКА`);
        console.log(`🔍 Ответ:`, JSON.stringify(data, null, 2));
      }

    } catch (error) {
      console.log(`❌ ОШИБКА ЗАПРОСА: ${error.message}`);
    }

    console.log('');
    console.log('─'.repeat(80));
    console.log('');
  }

  console.log('🎯 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!');
  console.log('');
  console.log('🎮 ДОСТУПНЫЕ SKINS В ИНВЕНТАРЕ:');
}

testSteamInventory().catch(console.error);