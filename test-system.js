#!/usr/bin/env node

/**
 * Простой тест Steam Marketplace системы
 */

const axios = require('axios');

async function testSteamMarketplace() {
  console.log('🧪 Тестирование Steam Marketplace системы\n');

  const tests = [
    {
      name: 'Frontend Server (Port 3000)',
      url: 'http://localhost:3000',
      description: 'Проверка фронтенд сервера'
    },
    {
      name: 'Steam Marketplace Page',
      url: 'http://localhost:3000/marketplace',
      description: 'Проверка страницы Steam Marketplace'
    },
    {
      name: 'API Status',
      url: 'http://localhost:3000/api/status',
      description: 'Проверка API статуса'
    },
    {
      name: 'NestJS Backend Health',
      url: 'http://localhost:3001/health',
      description: 'Проверка NestJS backend'
    },
    {
      name: 'Simple API',
      url: 'http://localhost:3004/api/health',
      description: 'Проверка простого API'
    }
  ];

  let workingServices = 0;

  for (const test of tests) {
    try {
      console.log(`🔍 Тестируем: ${test.name}`);
      console.log(`   URL: ${test.url}`);

      const startTime = Date.now();
      const response = await axios.get(test.url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'SteamMarketplaceTest/1.0'
        }
      });

      const duration = Date.now() - startTime;

      console.log(`   ✅ Работает (${duration}ms)`);
      console.log(`   📊 Статус: ${response.status}`);
      console.log(`   📄 Размер: ${response.data.length} байт`);

      if (response.data && typeof response.data === 'string') {
        const preview = response.data.substring(0, 100).replace(/\s+/g, ' ');
        console.log(`   📄 Контент: ${preview}...`);
      }

      workingServices++;
      console.log('');

    } catch (error) {
      console.log(`   ❌ Не работает: ${error.message}`);

      if (error.code === 'ECONNREFUSED') {
        console.log(`   🔧 Сервис не запущен или недоступен`);
      } else if (error.response) {
        console.log(`   📊 Статус: ${error.response.status}`);
      }

      console.log('');
    }
  }

  // Проверка Steam API
  console.log('🎮 Проверка Steam API:');
  try {
    const steamResponse = await axios.get(
      'https://steamcommunity.com/dev/apikey',
      { timeout: 10000 }
    );
    console.log('   ✅ Steam Community API доступен');
  } catch (error) {
    console.log('   ⚠️ Steam Community API недоступен');
  }

  // Сводка
  console.log('\n' + '='.repeat(50));
  console.log('📊 Результаты тестирования:');
  console.log('='.repeat(50));
  console.log(`   Работающих сервисов: ${workingServices}/${tests.length}`);
  console.log(`   Успеваемость: ${((workingServices / tests.length) * 100).toFixed(1)}%`);

  if (workingServices >= 3) {
    console.log('\n✅ Хорошо! Основные сервисы работают.');
    console.log('💡 Рекомендации:');
    console.log('   • Frontend: http://localhost:3000');
    console.log('   • Steam Marketplace: http://localhost:3000/marketplace');
    console.log('   • Backend API: http://localhost:3001');
  } else if (workingServices >= 1) {
    console.log('\n⚠️ Частичная работоспособность.');
    console.log('💡 Проверьте запуск сервисов:');
    console.log('   • npm run docker:up (инфраструктура)');
    console.log('   • npm run start:backend (NestJS backend)');
    console.log('   • node steam-server.js (frontend сервер)');
  } else {
    console.log('\n❌ Система не работает.');
    console.log('🚨 Необходимо перезапустить все сервисы:');
    console.log('   1. docker-compose up -d');
    console.log('   2. cd apps/backend && npm run start:dev');
    console.log('   3. node steam-server.js');
  }
}

// Запуск теста
testSteamMarketplace().catch(console.error);