#!/usr/bin/env node

/**
 * Smoke Test Suite
 * Проверяет основные endpoints после деплоя
 */

const http = require('http');

const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',
  timeout: 10000
};

let passedTests = 0;
let failedTests = 0;
const results = [];

/**
 * Выполняет HTTP запрос
 */
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(config.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Запускает тест
 */
async function runTest(name, testFunction) {
  console.log(`\n🧪 Running: ${name}`);

  try {
    const result = await testFunction();
    console.log(`✅ PASSED: ${name}`);
    passedTests++;
    results.push({ name, status: 'PASSED', error: null });
    return true;
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
    failedTests++;
    results.push({ name, status: 'FAILED', error: error.message });
    return false;
  }
}

/**
 * Тест 1: Health Check
 */
async function testHealthCheck() {
  const response = await makeRequest('/api/health');
  if (response.statusCode !== 200) {
    throw new Error(`Expected 200, got ${response.statusCode}`);
  }
  if (response.body.status !== 'healthy' && response.body.status !== 'unhealthy') {
    throw new Error(`Expected status 'healthy' or 'unhealthy', got ${response.body.status}`);
  }
  console.log('   Health status:', response.body.status);
}

/**
 * Тест 2: Readiness Probe
 */
async function testReadinessProbe() {
  const response = await makeRequest('/api/health/ready');
  if (response.statusCode !== 200 && response.statusCode !== 503) {
    throw new Error(`Expected 200 or 503, got ${response.statusCode}`);
  }
  if (response.body.status !== 'ready' && response.body.status !== 'not_ready') {
    throw new Error(`Expected status 'ready' or 'not_ready', got ${response.body.status}`);
  }
  console.log('   Readiness status:', response.body.status);
}

/**
 * Тест 3: Liveness Probe
 */
async function testLivenessProbe() {
  const response = await makeRequest('/api/health/live');
  if (response.statusCode !== 200) {
    throw new Error(`Expected 200, got ${response.statusCode}`);
  }
  if (response.body.status !== 'alive') {
    throw new Error(`Expected status 'alive', got ${response.body.status}`);
  }
  console.log('   Liveness status:', response.body.status);
}

/**
 * Тест 4: Ping Endpoint
 */
async function testPing() {
  const response = await makeRequest('/api/health/ping');
  if (response.statusCode !== 200) {
    throw new Error(`Expected 200, got ${response.statusCode}`);
  }
  if (response.body.message !== 'pong') {
    throw new Error(`Expected message 'pong', got ${response.body.message}`);
  }
}

/**
 * Тест 5: Auth Test User Endpoint
 */
async function testAuthTestUser() {
  const response = await makeRequest('/api/auth/test-user', 'POST');

  // Может быть 200 (если пользователь есть) или 404 (если нет)
  if (response.statusCode !== 200 && response.statusCode !== 404) {
    throw new Error(`Expected 200 or 404, got ${response.statusCode}`);
  }

  if (response.statusCode === 200) {
    console.log('   Test user authenticated successfully');
  } else {
    console.log('   Test user not found (this is OK)');
  }
}

/**
 * Тест 6: Auth Me Endpoint (без токена - должен вернуть 401)
 */
async function testAuthMeWithoutToken() {
  const response = await makeRequest('/api/auth/me');
  if (response.statusCode !== 401) {
    throw new Error(`Expected 401, got ${response.statusCode}`);
  }
}

/**
 * Тест 7: Marketplace Endpoint (без аутентификации)
 */
async function testMarketplaceEndpoint() {
  const response = await makeRequest('/api/marketplace/listings?page=1&limit=10');

  // Может быть 200 (публичный) или 401 (требует аутентификации)
  if (response.statusCode !== 200 && response.statusCode !== 401) {
    throw new Error(`Expected 200 or 401, got ${response.statusCode}`);
  }

  console.log('   Marketplace accessible with status:', response.statusCode);
}

/**
 * Главная функция
 */
async function main() {
  console.log('🚀 Steam Marketplace - Smoke Test Suite');
  console.log('=' .repeat(50));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Timeout: ${config.timeout}ms`);
  console.log('=' .repeat(50));

  // Запускаем тесты
  await runTest('Health Check', testHealthCheck);
  await runTest('Readiness Probe', testReadinessProbe);
  await runTest('Liveness Probe', testLivenessProbe);
  await runTest('Ping Endpoint', testPing);
  await runTest('Auth Test User', testAuthTestUser);
  await runTest('Auth Me (No Token)', testAuthMeWithoutToken);
  await runTest('Marketplace Endpoint', testMarketplaceEndpoint);

  // Подводим итоги
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total: ${passedTests + failedTests}`);

  if (failedTests === 0) {
    console.log('\n🎉 ALL SMOKE TESTS PASSED!');
    process.exit(0);
  } else {
    console.log('\n💥 SOME SMOKE TESTS FAILED!');
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAILED').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
}

// Обработка ошибок
process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled Rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught Exception:', error);
  process.exit(1);
});

// Запускаем тесты
main();
