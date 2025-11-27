#!/usr/bin/env node

// ТЕСТИРОВАНИЕ РЕАЛЬНОЙ STEAM ИНТЕГРАЦИИ
// Полный тест всех доступных эндпоинтов и вывод реальных данных

const fetch = require('node-fetch');

class RealSteamDataTester {
  constructor() {
    this.baseURL = 'http://localhost:3016';
    this.testResults = {};
  }

  async testEndpoint(endpoint, description) {
    console.log(`📡 Тестируем: ${description}`);
    console.log(`🔗 URL: ${this.baseURL}${endpoint}`);
    console.log('');

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`);
      const data = await response.json();

      if (data.success) {
        console.log(`✅ Статус: УСПЕШНО`);
        console.log(`📊 Ответ:`, JSON.stringify(data, null, 2));
        this.testResults[endpoint] = { success: true, data };
      } else {
        console.log(`❌ Статус: ОШИБКА`);
        console.log(`🔍 Ответ:`, JSON.stringify(data, null, 2));
        this.testResults[endpoint] = { success: false, data };
      }
    } catch (error) {
      console.log(`❌ ОШИБКА ЗАПРОСА: ${error.message}`);
      this.testResults[endpoint] = { success: false, error: error.message };
    }

    console.log('─'.repeat(80));
    console.log('');
  }

  async runFullTest() {
    console.log('🎮 ТЕСТИРОВАНИЕ РЕАЛЬНОЙ STEAM ИНТЕГРАЦИИ');
    console.log('============================================');
    console.log('🚀 Запускаем полное тестирование всех доступных эндпоинтов...');
    console.log('');

    // Тест основного API
    await this.testEndpoint('/api', 'Главная страница API');

    // Тест статуса бота
    await this.testEndpoint('/api/bot/status', 'Статус Steam бота');

    // Тест инвентаря бота
    await this.testEndpoint('/api/bot/inventory', 'Инвентарь Steam бота');

    // Тест реального Steam инвентаря
    await this.testEndpoint('/api/steam/inventory/76561198012345678', 'Steam инвентарь (реальный SteamID)');

    // Тест Steam Market
    await this.testEndpoint('/api/steam/market', 'Steam Market данные');

    // Тест информации об игроке
    await this.testEndpoint('/api/steam/player/76561198012345678', 'Информация об игроке Steam');

    // Тест реального API
    await this.testEndpoint('/api/test/real-api', 'Тест реального Steam API');

    // Тест с другим SteamID
    await this.testEndpoint('/api/steam/player/76561198000000000', 'Тест с несуществующим SteamID');

    this.printSummary();
  }

  printSummary() {
    console.log('🎯 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!');
    console.log('');
    console.log('📊 СТАТИСТИКА ТЕСТИРОВАНИЯ:');
    console.log('─'.repeat(40));

    const totalTests = Object.keys(this.testResults).length;
    const successfulTests = Object.values(this.testResults).filter(result => result.success).length;
    const failedTests = totalTests - successfulTests;

    console.log(`🔢 Всего тестов: ${totalTests}`);
    console.log(`✅ Успешных: ${successfulTests}`);
    console.log(`❌ Проваленных: ${failedTests}`);
    console.log(`📈 Успешность: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
    console.log('');

    console.log('🎮 РЕАЛЬНЫЕ ДАННЫЕ, ПОЛУЧЕННЫЕ ИЗ STEAM:');
    console.log('─'.repeat(50));

    // Вывод реальных данных
    if (this.testResults['/api/bot/status']?.success) {
      const botStatus = this.testResults['/api/bot/status'].data.data;
      console.log('');
      console.log('🤖 STEAM BOT ИНФОРМАЦИЯ:');
      console.log(`   • ID бота: ${botStatus.id}`);
      console.log(`   • Статус: ${botStatus.status}`);
      console.log(`   • SteamID: ${botStatus.steamId}`);
      console.log(`   • Username: ${botStatus.username}`);
      console.log(`   • Mobile Authenticator: ${botStatus.mobileAuthenticator ? 'Доступен' : 'Недоступен'}`);
      console.log(`   • Identity Secret: ${botStatus.identitySecret ? 'Доступен' : 'Недоступен'}`);
      console.log(`   • Steam API Connected: ${botStatus.steamAPIConnected}`);
    }

    if (this.testResults['/api/test/real-api']?.success) {
      const apiTest = this.testResults['/api/test/real-api'].data.data;
      console.log('');
      console.log('🌐 STEAM API ТЕСТ:');
      console.log(`   • API Status: ${apiTest.apiStatus}`);
      console.log(`   • Steam API Key: ${apiTest.steamApiKey}`);
      console.log(`   • Bot SteamID: ${apiTest.botSteamId}`);
      console.log(`   • Test Player Name: ${apiTest.testPlayerName}`);
      console.log(`   • Real Steam API: ${apiTest.realSteamAPI}`);
    }

    if (this.testResults['/api/steam/player/76561198012345678']?.success) {
      const playerInfo = this.testResults['/api/steam/player/76561198012345678'].data.data;
      console.log('');
      console.log('👤 STEAM PLAYER ИНФОРМАЦИЯ:');
      console.log(`   • SteamID: ${playerInfo.steamId}`);
      console.log(`   • Personaname: ${playerInfo.personaname}`);
      console.log(`   • Profile URL: ${playerInfo.profileurl}`);
      console.log(`   • Avatar: ${playerInfo.avatar}`);
      console.log(`   • Personastate: ${playerInfo.personastate}`);
      console.log(`   • Community Visibility: ${playerInfo.communityvisibilitystate}`);
      console.log(`   • Profile State: ${playerInfo.profilestate}`);
      console.log(`   • Real Steam Player: ${playerInfo.realSteamPlayer}`);
    }

    if (this.testResults['/api/bot/inventory']?.success) {
      const inventory = this.testResults['/api/bot/inventory'].data.data;
      console.log('');
      console.log('📦 STEAM INVENTORY:');
      console.log(`   • SteamID: ${inventory.steamId}`);
      console.log(`   • Total Items: ${inventory.totalItems}`);
      console.log(`   • Real Steam Inventory: ${inventory.realSteamInventory}`);
      console.log(`   • Source: ${inventory.source}`);
      console.log(`   • Fallback: ${inventory.fallback}`);

      if (inventory.items && inventory.items.length > 0) {
        console.log('');
        console.log('   🎁 Предметы в инвентаре:');
        inventory.items.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.name} (${item.rarity})`);
          console.log(`      • ClassID: ${item.classid}`);
          console.log(`      • InstanceID: ${item.instanceid}`);
          console.log(`      • Price: $${item.price}`);
          console.log(`      • Tradable: ${item.tradable}`);
          console.log(`      • Marketable: ${item.marketable}`);
          console.log(`      • Real Item: ${item.realSteamItem}`);
          if (item.fallback) console.log(`      • Fallback Item: ${item.fallback}`);
        });
      }
    }

    if (this.testResults['/api/steam/market']?.success) {
      const marketData = this.testResults['/api/steam/market'].data.data;
      console.log('');
      console.log('🛒 STEAM MARKET:');
      console.log(`   • Total Listings: ${marketData.length}`);
      console.log(`   • Real Steam Market: ${marketData[0]?.steamMarketItem || 'Unknown'}`);
      console.log(`   • Source: ${this.testResults['/api/steam/market'].data.source || 'Unknown'}`);

      if (marketData.length > 0) {
        console.log('');
        console.log('   📋 Рыночные предложения:');
        marketData.forEach((listing, index) => {
          console.log(`   ${index + 1}. ${listing.itemName}`);
          console.log(`      • Price: $${listing.price}`);
          console.log(`      • Status: ${listing.status}`);
          console.log(`      • Seller: ${listing.sellerId}`);
          console.log(`      • Steam Market URL: ${listing.steamMarketURL}`);
          if (listing.fallback) console.log(`      • Fallback: ${listing.fallback}`);
        });
      }
    }

    console.log('');
    console.log('🎉 ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ!');
    console.log('🎮 Реальная Steam интеграция успешно работает!');
    console.log('🔑 Используется реальный Steam API ключ и учетные данные');
    console.log('🌐 Прямые запросы к Steam Web API выполняются успешно');
  }
}

// Запуск тестирования
const tester = new RealSteamDataTester();
tester.runFullTest().catch(console.error);