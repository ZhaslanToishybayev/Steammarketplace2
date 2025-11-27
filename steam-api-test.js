#!/usr/bin/env node

const https = require('https');

const STEAM_API_KEY = "E1FC69B3707FF57C6267322B0271A86B";

console.log("🎮 Тестирование Steam API");
console.log("==========================================");
console.log("");

async function testSteamAPI() {
  const tests = [
    {
      name: "Steam Web API",
      url: `https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIVersions/v1/?key=${STEAM_API_KEY}`,
      parse: (data) => data.includes("apilist")
    },
    {
      name: "CS:GO Online Players",
      url: `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=730&key=${STEAM_API_KEY}`,
      parse: (data) => {
        const match = data.match(/"player_count":(\d+)/);
        if (match) {
          console.log(`   ✅ CS:GO игроков онлайн: ${match[1]}`);
          return true;
        }
        return false;
      }
    },
    {
      name: "Dota 2 Online Players",
      url: `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=570&key=${STEAM_API_KEY}`,
      parse: (data) => {
        const match = data.match(/"player_count":(\d+)/);
        if (match) {
          console.log(`   ✅ Dota 2 игроков онлайн: ${match[1]}`);
          return true;
        }
        return false;
      }
    },
    {
      name: "Steam Store API",
      url: "https://store.steampowered.com/api/featuredcategories/",
      parse: (data) => data.includes("specials")
    }
  ];

  let passedTests = 0;

  for (const test of tests) {
    try {
      console.log(`Тест: ${test.name}...`);

      const data = await makeRequest(test.url);

      if (test.parse(data)) {
        console.log(`   ✅ ${test.name}: Работает`);
        passedTests++;
      } else {
        console.log(`   ❌ ${test.name}: Ошибка ответа`);
      }
    } catch (error) {
      console.log(`   ❌ ${test.name}: Ошибка - ${error.message}`);
    }
    console.log("");
  }

  console.log("📊 Результаты тестирования:");
  console.log(`==================================`);
  console.log(`Пройдено тестов: ${passedTests}/${tests.length}`);

  if (passedTests === tests.length) {
    console.log("🎉 Все тесты пройдены! Steam API работает корректно.");
  } else {
    console.log("⚠️  Некоторые тесты не прошли. Проверьте подключение к Steam API.");
  }

  return passedTests === tests.length;
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.path + (urlObj.search || ''),
      method: 'GET',
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Test Steam Inventory API
async function testSteamInventory() {
  console.log("📦 Тестирование Steam Inventory API");
  console.log("==========================================");
  console.log("");

  try {
    // Test CS:GO inventory
    const steamId = "76561198123456789"; // Заменить на реальный Steam ID для тестирования
    const appId = 730; // CS:GO

    const inventoryUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=50`;

    console.log("Тест: CS:GO Inventory...");
    const data = await makeRequest(inventoryUrl);

    try {
      const inventory = JSON.parse(data);
      if (inventory && (inventory.assets || inventory.descriptions)) {
        console.log("   ✅ CS:GO Inventory: Работает");
        console.log(`   📊 Предметов в инвентаре: ${inventory.assets ? inventory.assets.length : 0}`);
        return true;
      } else {
        console.log("   ❌ CS:GO Inventory: Пустой ответ");
        return false;
      }
    } catch (parseError) {
      console.log("   ❌ CS:GO Inventory: Ошибка парсинга JSON");
      return false;
    }
  } catch (error) {
    console.log(`   ❌ CS:GO Inventory: ${error.message}`);
    return false;
  }
}

// Test Steam Trading API
async function testSteamTrading() {
  console.log("🔄 Тестирование Steam Trading API");
  console.log("==========================================");
  console.log("");

  try {
    // Test trade offers endpoint
    const steamId = "76561198123456789"; // Заменить на реальный Steam ID

    const tradeUrl = `https://api.steampowered.com/IEconService/GetTradeOffers/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&get_sent_offers=1&get_received_offers=1`;

    console.log("Тест: Steam Trade Offers...");
    const data = await makeRequest(tradeUrl);

    try {
      const tradeData = JSON.parse(data);
      console.log("   ✅ Steam Trade API: Работает");
      console.log("   📋 Trade offers endpoint доступен");
      return true;
    } catch (parseError) {
      console.log("   ❌ Steam Trade API: Ошибка парсинга JSON");
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Steam Trade API: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🚀 Запуск комплексного тестирования Steam Integration");
  console.log("==================================================");
  console.log("");

  const apiSuccess = await testSteamAPI();
  console.log("");
  const inventorySuccess = await testSteamInventory();
  console.log("");
  const tradingSuccess = await testSteamTrading();

  console.log("");
  console.log("🎯 Финальные результаты:");
  console.log("=========================");
  console.log(`Steam Web API: ${apiSuccess ? '✅ Работает' : '❌ Не работает'}`);
  console.log(`Steam Inventory: ${inventorySuccess ? '✅ Работает' : '❌ Не работает'}`);
  console.log(`Steam Trading: ${tradingSuccess ? '✅ Работает' : '❌ Не работает'}`);

  if (apiSuccess && inventorySuccess && tradingSuccess) {
    console.log("");
    console.log("🎉 Поздравляем! Steam Integration полностью работает!");
    console.log("Теперь вы можете:");
    console.log("  • Интегрировать Steam OAuth аутентификацию");
    console.log("  • Работать с инвентарем пользователей");
    console.log("  • Обрабатывать торговые предложения");
    console.log("  • Получать реальное время игровые данные");
  } else {
    console.log("");
    console.log("⚠️  Требуется внимание:");
    if (!apiSuccess) console.log("  • Проверьте Steam Web API ключ");
    if (!inventorySuccess) console.log("  • Проверьте доступ к Steam Inventory");
    if (!tradingSuccess) console.log("  • Проверьте Steam Trading API");
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testSteamAPI, testSteamInventory, testSteamTrading };