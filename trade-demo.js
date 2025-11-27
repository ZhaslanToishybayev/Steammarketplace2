#!/usr/bin/env node

// ДЕМОНСТРАЦИЯ СИСТЕМЫ ТОРГОВЛИ СТЕАМ БОТА
// Показывает как использовать Steam Trade Manager API

const axios = require('axios');

class TradeDemo {
  constructor() {
    this.baseURL = 'http://localhost:3020';
  }

  async testAPI() {
    console.log('🎮 ДЕМОНСТРАЦИЯ СИСТЕМЫ ТОРГОВЛИ СТЕАМ БОТА');
    console.log('================================================');
    console.log('');

    try {
      // 1. Проверка статуса API
      console.log('1. Проверка статуса API...');
      const apiResponse = await axios.get(`${this.baseURL}/api`);
      console.log('✅ API доступен');
      console.log(`   Версия: ${apiResponse.data.version}`);
      console.log(`   Сервис: ${apiResponse.data.service}`);
      console.log('');

      // 2. Проверка статуса бота
      console.log('2. Проверка статуса бота...');
      const statusResponse = await axios.get(`${this.baseURL}/api/account/status`);
      console.log(`   Статус бота: ${statusResponse.data.data.botStatus}`);
      console.log(`   SteamID: ${statusResponse.data.data.steamId}`);
      console.log(`   Username: ${statusResponse.data.data.username}`);
      console.log(`   Mobile Authenticator: ${statusResponse.data.data.mobileAuthenticator ? 'Доступен' : 'Недоступен'}`);
      console.log('');

      // 3. Проверка профиля бота
      console.log('3. Получение профиля бота...');
      try {
        const profileResponse = await axios.get(`${this.baseURL}/api/account/profile`);
        console.log('✅ Профиль бота получен');
        console.log(`   Имя: ${profileResponse.data.data.personaname}`);
        console.log(`   SteamID: ${profileResponse.data.data.steamId}`);
        console.log(`   Статус: ${profileResponse.data.data.personastate}`);
        console.log('');
      } catch (error) {
        console.log('❌ Профиль не доступен (бот не авторизован)');
        console.log('');
      }

      // 4. Проверка инвентаря бота
      console.log('4. Проверка инвентаря бота...');
      try {
        const inventoryResponse = await axios.get(`${this.baseURL}/api/inventory/bot`);
        if (inventoryResponse.data.success) {
          console.log(`✅ Инвентарь бота получен: ${inventoryResponse.data.data.totalItems} предметов`);
          if (inventoryResponse.data.data.items.length > 0) {
            console.log('   Первые 5 предметов:');
            inventoryResponse.data.data.items.slice(0, 5).forEach((item, index) => {
              console.log(`     ${index + 1}. ${item.name} - $${item.price}`);
            });
          }
        } else {
          console.log('❌ Инвентарь не доступен');
        }
        console.log('');
      } catch (error) {
        console.log('❌ Инвентарь не доступен (бот не авторизован)');
        console.log('');
      }

      // 5. Демонстрация создания trade offer
      console.log('5. Демонстрация создания trade offer...');
      console.log('');
      console.log('📝 ПРИМЕР ЗАПРОСА ДЛЯ СОЗДАНИЯ ТРЕЙД ОФФЕРА:');
      console.log('POST /api/trades/create');
      console.log('Headers: Content-Type: application/json');
      console.log('Body:');
      console.log(JSON.stringify({
        partnerSteamId: '76561198087654321', // SteamID другого аккаунта
        itemsFromBot: [
          {
            assetid: '123456789',
            name: 'AK-47 | Redline (Field-Tested)',
            price: 125.5
          }
        ],
        itemsFromPartner: [
          {
            assetid: '987654321',
            name: 'M4A4 | Dragon King (Factory New)',
            price: 899.99
          }
        ],
        message: 'Trade offer from Steam bot'
      }, null, 2));
      console.log('');
      console.log('💰 ЭТОТ ЗАПРОС:');
      console.log('   • Отправит трейд оффер от бота на указанный SteamID');
      console.log('   • Бот даст AK-47 Redline (Field-Tested)');
      console.log('   • Получит в ответ M4A4 Dragon King (Factory New)');
      console.log('   • Общая выгода для бота: $774.49');
      console.log('');

      // 6. Демонстрация других API endpoints
      console.log('6. ДРУГИЕ ДОСТУПНЫЕ ENDPOINTS:');
      console.log('');
      console.log('📊 TRADE MANAGEMENT:');
      console.log('   GET /api/trades/status/{tradeId}     - Проверить статус трейда');
      console.log('   POST /api/trades/cancel/{tradeId}   - Отменить трейд');
      console.log('   GET /api/trades/sent                - Список отправленных трейдов');
      console.log('   GET /api/trades/received             - Список полученных трейдов');
      console.log('');
      console.log('🎁 INVENTORY ACCESS:');
      console.log('   GET /api/inventory/bot              - Инвентарь бота');
      console.log('   GET /api/inventory/user/{steamId}   - Инвентарь любого пользователя');
      console.log('');
      console.log('🤖 ACCOUNT INFO:');
      console.log('   GET /api/account/status             - Статус бота');
      console.log('   GET /api/account/profile            - Профиль бота');
      console.log('');

      // 7. Показать как использовать систему
      console.log('7. КАК ИСПОЛЬЗОВАТЬ ЭТУ СИСТЕМУ:');
      console.log('');
      console.log('📝 ШАГ 1: Убедитесь что бот авторизован');
      console.log('   • Бот должен быть online (steam-trade-manager.js должен быть запущен)');
      console.log('   • SteamID: 76561198012345678');
      console.log('   • Username: Sgovt1');
      console.log('   • Mobile Authenticator: Доступен');
      console.log('');
      console.log('📝 ШАГ 2: Получите SteamID другого аккаунта');
      console.log('   • Это SteamID аккаунта, которому вы хотите отправить трейд');
      console.log('   • Например: 76561198087654321');
      console.log('');
      console.log('📝 ШАГ 3: Получите assetid предметов');
      console.log('   • Используйте GET /api/inventory/bot чтобы увидеть доступные предметы');
      console.log('   • Каждый предмет имеет уникальный assetid');
      console.log('');
      console.log('📝 ШАГ 4: Создайте трейд оффер');
      console.log('   • Отправьте POST запрос на /api/trades/create');
      console.log('   • Укажите itemsFromBot и itemsFromPartner');
      console.log('   • Получите tradeId и статус');
      console.log('');
      console.log('📝 ШАГ 5: Отслеживайте статус');
      console.log('   • Используйте GET /api/trades/status/{tradeId}');
      console.log('   • Статусы: Active, Accepted, Declined, Cancelled, etc.');
      console.log('');

      console.log('🎉 СИСТЕМА ГОТОВА К РАБОТЕ!');
      console.log('================================================');
      console.log('');
      console.log('🚀 Чтобы начать использовать торговлю:');
      console.log('   1. Дождитесь пока бот авторизуется (он может быть временно offline)');
      console.log('   2. Получите реальные assetid предметов из инвентаря бота');
      console.log('   3. Создайте трейд оффер на нужный SteamID');
      console.log('   4. Подтвердите трейд через Steam Mobile Authenticator');

    } catch (error) {
      console.error('❌ Ошибка при тестировании API:', error.message);
    }
  }
}

// Запуск демонстрации
const demo = new TradeDemo();
demo.testAPI().catch(console.error);