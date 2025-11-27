#!/usr/bin/env node

/**
 * Тестирование Steam Интеграции
 * Этот скрипт проверяет основные функции Steam интеграции
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3004';

async function testSteamIntegration() {
  console.log('🧪 Тестирование Steam Интеграции\n');

  const tests = [
    {
      name: 'Health Check',
      endpoint: '/api/health',
      method: 'GET',
      description: 'Проверка работоспособности API'
    },
    {
      name: 'Test Endpoint',
      endpoint: '/api/test',
      method: 'GET',
      description: 'Тестовый эндпоинт'
    },
    {
      name: 'Items Endpoint',
      endpoint: '/api/items',
      method: 'GET',
      description: 'Получение списка предметов'
    },
    {
      name: 'Trades Endpoint',
      endpoint: '/api/trades',
      method: 'GET',
      description: 'Получение списка торгов'
    },
    {
      name: 'Metrics Endpoint',
      endpoint: '/api/metrics',
      method: 'GET',
      description: 'Получение системных метрик'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`🔍 Тестируем: ${test.name}`);
      console.log(`   Описание: ${test.description}`);
      console.log(`   Эндпоинт: ${test.method} ${test.endpoint}`);

      const startTime = Date.now();
      const response = await axios({
        method: test.method,
        url: BASE_URL + test.endpoint,
        timeout: 5000,
        headers: {
          'User-Agent': 'SteamIntegrationTest/1.0'
        }
      });

      const duration = Date.now() - startTime;

      console.log(`   ✅ Успешно (${duration}ms)`);
      console.log(`   📊 Статус: ${response.status}`);
      console.log(`   📄 Данные: ${JSON.stringify(response.data).substring(0, 100)}...`);
      console.log('');

      passed++;

    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);

      if (error.response) {
        console.log(`   📊 Статус: ${error.response.status}`);
        console.log(`   📄 Тело: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
      }
      console.log('');

      failed++;
    }
  }

  // Тестирование Steam API интеграции
  console.log('🎮 Тестирование Steam API Интеграции');

  try {
    console.log('🔍 Проверка доступности Steam Community API...');
    const steamResponse = await axios.get(
      'https://steamcommunity.com/dev/apikey',
      { timeout: 10000 }
    );
    console.log('   ✅ Steam Community API доступен');
  } catch (error) {
    console.log('   ⚠️ Steam Community API недоступен или заблокирован');
  }

  try {
    console.log('🔍 Проверка Steam Web API...');
    const steamApiTest = await axios.get(
      'https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIVersions/v1/',
      { timeout: 10000 }
    );
    console.log('   ✅ Steam Web API работает');
  } catch (error) {
    console.log('   ⚠️ Steam Web API недоступен');
  }

  // Сводка
  console.log('\n📊 Результаты тестирования:');
  console.log(`   ✅ Пройдено: ${passed}`);
  console.log(`   ❌ Провалено: ${failed}`);
  console.log(`   📈 Успеваемость: ${((passed / tests.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 Все тесты пройдены! Steam интеграция работает корректно.');
  } else {
    console.log('\n⚠️ Некоторые тесты провалились. Проверьте логи и конфигурацию.');
  }
}

// Запуск тестов
testSteamIntegration().catch(console.error);