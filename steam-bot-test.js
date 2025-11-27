#!/usr/bin/env node

console.log('🎮 STEAM BOT SYSTEM TEST');
console.log('==========================');
console.log('');

const endpoints = [
  {
    name: 'Steam Bot Status',
    url: 'http://localhost:3014/api/bots/status',
    description: 'Статус реального Steam бота'
  },
  {
    name: 'Bot Inventory',
    url: 'http://localhost:3014/api/bots/steam_bot_1/inventory',
    description: 'Инвентарь бота с реальными предметами CS:GO'
  },
  {
    name: 'Bot Trades',
    url: 'http://localhost:3014/api/bots/steam_bot_1/trades',
    description: 'Торговые сделки бота'
  },
  {
    name: 'Create Trade Offer',
    url: 'POST http://localhost:3014/api/trade/create',
    description: 'Создание реального торгового предложения'
  },
  {
    name: 'Steam Market',
    url: 'http://localhost:3014/api/steam/market',
    description: 'Реальные лоты Steam Market'
  },
  {
    name: 'Steam Inventory',
    url: 'http://localhost:3014/api/steam/inventory/76561198012345678',
    description: 'Реальный Steam инвентарь'
  }
];

const fetch = require('node-fetch');

async function testEndpoint(endpoint) {
  try {
    console.log(`📡 Тестируем: ${endpoint.name}`);
    console.log(`🔗 URL: ${endpoint.url}`);
    console.log(`📝 Описание: ${endpoint.description}`);

    let response;
    if (endpoint.url.includes('POST')) {
      const url = endpoint.url.replace('POST ', '');
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: 'steam_bot_1',
          partnerSteamId: '76561198087654321',
          itemsFromMe: ['AK-47 | Redline'],
          itemsFromThem: ['M4A4 | Dragon King'],
          message: 'Trade offer from Steam Bot System'
        })
      });
    } else {
      response = await fetch(endpoint.url);
    }

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Статус: УСПЕШНО`);
      console.log(`📊 Ответ:`, JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ Статус: ОШИБКА`);
      console.log(`🔍 Ответ:`, JSON.stringify(data, null, 2));
    }

    console.log('');
    console.log('─'.repeat(80));
    console.log('');

  } catch (error) {
    console.log(`❌ ОШИБКА ЗАПРОСА: ${error.message}`);
    console.log('');
    console.log('─'.repeat(80));
    console.log('');
  }
}

async function runTest() {
  console.log('🚀 Запускаем тест Steam Bot System...\\n');

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }

  console.log('🎯 ТЕСТ ЗАВЕРШЕН!');
  console.log('');
  console.log('🎮 РЕАЛЬНАЯ STEAM ИНТЕГРАЦИЯ:');
  console.log('✨ Что вы видите:');
  console.log('   • Реальный Steam бот: steam_bot_1');
  console.log('   • Учетные данные: Sgovt1 / Szxc123!');
  console.log('   • Mobile Authenticator: Доступен');
  console.log('   • Identity Secret: Доступен');
  console.log('   • Steam API Key: E1FC69B3707FF57C6267322B0271A86B');
  console.log('');
  console.log('💡 Доступ к системе:');
  console.log('   • Steam Bot API: http://localhost:3014');
}

runTest().catch(console.error);