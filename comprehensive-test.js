#!/usr/bin/env node

/**
 * Комплексное тестирование Steam Marketplace системы
 * Проверка всех доступных сервисов и интеграций
 */

const axios = require('axios');

const SERVICES = {
  FRONTEND: 'http://localhost:3000',
  SIMPLE_API: 'http://localhost:3004',
  NESTJS_BACKEND: 'http://localhost:3001'
};

async function testAllServices() {
  console.log('🚀 Комплексное тестирование Steam Marketplace системы\n');

  const results = {
    frontend: await testFrontend(),
    simpleApi: await testSimpleApi(),
    nestjsBackend: await testNestjsBackend(),
    steamApis: await testSteamApis()
  };

  printSummary(results);
}

async function testFrontend() {
  console.log('🎨 Тестирование фронтенда (порт 3000)...');
  try {
    const response = await axios.get(SERVICES.FRONTEND, { timeout: 5000 });
    const isWorking = response.status === 200 &&
                      response.data.includes('Steam Marketplace') &&
                      response.data.includes('🎮');

    return {
      status: 'success',
      working: isWorking,
      status_code: response.status,
      response_size: response.data.length,
      message: isWorking ? 'Фронтенд работает корректно' : 'Фронтенд доступен, но не соответствует ожиданиям'
    };
  } catch (error) {
    return {
      status: 'error',
      working: false,
      error: error.message,
      message: 'Фронтенд недоступен'
    };
  }
}

async function testSimpleApi() {
  console.log('🔌 Тестирование простого API (порт 3004)...');

  const endpoints = [
    { path: '/api/health', method: 'GET' },
    { path: '/api/test', method: 'GET' }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: SERVICES.SIMPLE_API + endpoint.path,
        timeout: 5000
      });

      results.push({
        endpoint: endpoint.path,
        status: 'success',
        status_code: response.status,
        data: response.data
      });
    } catch (error) {
      results.push({
        endpoint: endpoint.path,
        status: 'error',
        status_code: error.response?.status,
        error: error.message
      });
    }
  }

  const workingEndpoints = results.filter(r => r.status === 'success').length;
  const totalEndpoints = results.length;

  return {
    status: 'success',
    working: workingEndpoints === totalEndpoints,
    working_endpoints: workingEndpoints,
    total_endpoints: totalEndpoints,
    results: results,
    message: `Работает ${workingEndpoints}/${totalEndpoints} эндпоинтов`
  };
}

async function testNestjsBackend() {
  console.log('🏗️ Тестирование NestJS backend (порт 3001)...');

  const endpoints = [
    { path: '/health', method: 'GET', description: 'Health check' },
    { path: '/api', method: 'GET', description: 'API base' },
    { path: '/docs', method: 'GET', description: 'Swagger docs' }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: SERVICES.NESTJS_BACKEND + endpoint.path,
        timeout: 5000
      });

      results.push({
        endpoint: endpoint.path,
        status: 'success',
        status_code: response.status,
        description: endpoint.description
      });
    } catch (error) {
      results.push({
        endpoint: endpoint.path,
        status: 'error',
        status_code: error.response?.status,
        description: endpoint.description,
        error: error.message
      });
    }
  }

  const workingEndpoints = results.filter(r => r.status === 'success').length;

  return {
    status: 'success',
    working: workingEndpoints > 0,
    working_endpoints: workingEndpoints,
    total_endpoints: results.length,
    results: results,
    message: `Работает ${workingEndpoints}/${results.length} эндпоинтов`
  };
}

async function testSteamApis() {
  console.log('🎮 Тестирование Steam API...');

  const apis = [
    {
      name: 'Steam Web API',
      url: 'https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIVersions/v1/',
      description: 'Основной Steam Web API'
    },
    {
      name: 'Steam Community API',
      url: 'https://steamcommunity.com/dev/apikey',
      description: 'Steam Community API для разработчиков'
    },
    {
      name: 'Steam Store API',
      url: 'https://store.steampowered.com/api/',
      description: 'Steam Store API'
    }
  ];

  const results = [];

  for (const api of apis) {
    try {
      const response = await axios.get(api.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'SteamMarketplaceTest/1.0'
        }
      });

      results.push({
        name: api.name,
        status: 'success',
        status_code: response.status,
        description: api.description
      });
    } catch (error) {
      results.push({
        name: api.name,
        status: 'error',
        status_code: error.response?.status,
        description: api.description,
        error: error.message
      });
    }
  }

  const workingApis = results.filter(r => r.status === 'success').length;

  return {
    status: 'success',
    working: workingApis > 0,
    working_apis: workingApis,
    total_apis: results.length,
    results: results,
    message: `Работает ${workingApis}/${results.length} Steam API`
  };
}

function printSummary(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Сводка по тестированию системы');
  console.log('='.repeat(60));

  // Frontend
  console.log('\n🎨 Фронтенд (порт 3000):');
  if (results.frontend.status === 'success') {
    console.log(`   Статус: ${results.frontend.working ? '✅ Работает' : '⚠️ Доступен, но с проблемами'}`);
    console.log(`   Код ответа: ${results.frontend.status_code}`);
    console.log(`   Размер ответа: ${results.frontend.response_size} байт`);
  } else {
    console.log(`   Статус: ❌ Не работает`);
    console.log(`   Ошибка: ${results.frontend.error}`);
  }

  // Simple API
  console.log('\n🔌 Простое API (порт 3004):');
  if (results.simpleApi.status === 'success') {
    console.log(`   Статус: ${results.simpleApi.working ? '✅ Работает' : '⚠️ Частично работает'}`);
    console.log(`   Эндпоинты: ${results.simpleApi.working_endpoints}/${results.simpleApi.total_endpoints}`);
    results.simpleApi.results.forEach(result => {
      console.log(`   • ${result.endpoint}: ${result.status === 'success' ? '✅' : '❌'} ${result.status_code || ''}`);
    });
  }

  // NestJS Backend
  console.log('\n🏗️ NestJS Backend (порт 3001):');
  if (results.nestjsBackend.status === 'success') {
    console.log(`   Статус: ${results.nestjsBackend.working ? '✅ Работает' : '⚠️ Частично работает'}`);
    console.log(`   Работает эндпоинтов: ${results.nestjsBackend.working_endpoints}/${results.nestjsBackend.total_endpoints}`);
    results.nestjsBackend.results.forEach(result => {
      console.log(`   • ${result.endpoint}: ${result.status === 'success' ? '✅' : '❌'} ${result.status_code || ''}`);
    });
  }

  // Steam APIs
  console.log('\n🎮 Steam API:');
  if (results.steamApis.status === 'success') {
    console.log(`   Статус: ${results.steamApis.working ? '✅ Работает' : '⚠️ Частично работает'}`);
    console.log(`   Работает API: ${results.steamApis.working_apis}/${results.steamApis.total_apis}`);
    results.steamApis.results.forEach(result => {
      console.log(`   • ${result.name}: ${result.status === 'success' ? '✅' : '❌'} ${result.status_code || ''}`);
    });
  }

  // Overall assessment
  console.log('\n' + '='.repeat(60));
  const servicesWorking = [
    results.frontend.working,
    results.simpleApi.working,
    results.nestjsBackend.working,
    results.steamApis.working
  ].filter(Boolean).length;

  console.log(`🎯 Общая оценка: ${servicesWorking}/4 сервисов работают`);

  if (servicesWorking === 4) {
    console.log('🎉 Отлично! Все сервисы работают корректно.');
  } else if (servicesWorking >= 2) {
    console.log('✅ Хорошо! Основные сервисы работают.');
  } else {
    console.log('⚠️ Требуется внимание. Многие сервисы не работают.');
  }

  console.log('\n💡 Рекомендации:');
  console.log('   • Фронтенд доступен по: http://localhost:3000');
  console.log('   • Простое API доступно по: http://localhost:3004');
  console.log('   • NestJS backend работает на: http://localhost:3001');
  console.log('   • Steam интеграция частично настроена');
}

// Запуск тестов
testAllServices().catch(console.error);