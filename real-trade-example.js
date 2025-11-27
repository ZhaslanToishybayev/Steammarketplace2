#!/usr/bin/env node

// ПРАКТИЧЕСКИЙ ПРИМЕР СОЗДАНИЯ ТРЕЙД ОФФЕРА
// Этот скрипт показывает как создать реальный trade offer

const axios = require('axios');

class RealTradeExample {
  constructor() {
    this.baseURL = 'http://localhost:3020';
    this.partnerSteamId = '76561198087654321'; // Замените на реальный SteamID
  }

  async createTradeOffer() {
    console.log('🎮 СОЗДАНИЕ РЕАЛЬНОГО ТРЕЙД ОФФЕРА');
    console.log('=====================================');
    console.log('');

    try {
      // Проверяем статус бота
      console.log('1. Проверка статуса бота...');
      const statusResponse = await axios.get(`${this.baseURL}/api/account/status`);

      if (statusResponse.data.data.botStatus !== 'online') {
        console.log('❌ Бот не авторизован. Дождитесь пока бот войдет в Steam.');
        console.log(`   Текущий статус: ${statusResponse.data.data.botStatus}`);
        console.log('   SteamID: 76561198012345678');
        console.log('   Username: Sgovt1');
        return;
      }

      console.log('✅ Бот авторизован');
      console.log('');

      // Получаем инвентарь бота
      console.log('2. Получение инвентаря бота...');
      const inventoryResponse = await axios.get(`${this.baseURL}/api/inventory/bot`);

      if (!inventoryResponse.data.success) {
        console.log('❌ Не удалось получить инвентарь бота');
        console.log(`   Ошибка: ${inventoryResponse.data.error}`);
        return;
      }

      const items = inventoryResponse.data.data.items;
      console.log(`✅ Получено ${items.length} предметов`);

      if (items.length === 0) {
        console.log('❌ Инвентарь бота пуст. Нечего торговать.');
        return;
      }

      // Показываем доступные предметы
      console.log('');
      console.log('📦 ДОСТУПНЫЕ ПРЕДМЕТЫ В ИНВЕНТАРЕ БОТА:');
      console.log('─'.repeat(60));

      items.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   • AssetID: ${item.assetid}`);
        console.log(`   • Цена: $${item.price}`);
        console.log(`   • Tradable: ${item.tradable ? 'Да' : 'Нет'}`);
        console.log(`   • Marketable: ${item.marketable ? 'Да' : 'Нет'}`);
        console.log('');
      });

      if (items.length > 10) {
        console.log(`... и еще ${items.length - 10} предметов`);
      }

      // Выбираем предметы для трейда (пример)
      console.log('3. Создание примера трейд оффера...');
      console.log('');

      // Для примера возьмем первый доступный предмет
      const botItem = items.find(item => item.tradable && item.marketable);

      if (!botItem) {
        console.log('❌ Нет подходящих для торговли предметов в инвентаре бота');
        return;
      }

      console.log('📝 ПРИМЕР ТРЕЙД ОФФЕРА:');
      console.log(`   Бот дает: ${botItem.name} (AssetID: ${botItem.assetid})`);
      console.log(`   Бот получает: M4A4 Dragon King (Factory New)`);
      console.log(`   Стоимость бота: $${botItem.price}`);
      console.log(`   Стоимость получаемого: $899.99`);
      console.log(`   Выгода: $${(899.99 - botItem.price).toFixed(2)}`);
      console.log('');

      // Создаем трейд оффер
      console.log('4. Отправка трейд оффера...');

      const tradeData = {
        partnerSteamId: this.partnerSteamId,
        itemsFromBot: [
          {
            assetid: botItem.assetid,
            name: botItem.name,
            price: botItem.price
          }
        ],
        itemsFromPartner: [
          {
            assetid: '987654321', // Пример assetid
            name: 'M4A4 | Dragon King (Factory New)',
            price: 899.99
          }
        ],
        message: 'Trade offer from Steam bot - выгодный обмен!'
      };

      console.log('📤 Отправка запроса...');
      console.log('   POST /api/trades/create');
      console.log('   Body:', JSON.stringify(tradeData, null, 2));

      const tradeResponse = await axios.post(`${this.baseURL}/api/trades/create`, tradeData);

      if (tradeResponse.data.success) {
        console.log('');
        console.log('✅ ТРЕЙД ОФФЕР УСПЕШНО СОЗДАН!');
        console.log('─'.repeat(50));
        console.log(`   Trade ID: ${tradeResponse.data.data.tradeId}`);
        console.log(`   Статус: ${tradeResponse.data.data.status}`);
        console.log(`   Партнер SteamID: ${tradeResponse.data.data.partnerSteamId}`);
        console.log(`   Бот дает: ${tradeResponse.data.data.itemsFromBot[0]?.name}`);
        console.log(`   Бот получает: ${tradeResponse.data.data.itemsFromPartner[0]?.name}`);
        console.log(`   Сообщение: ${tradeResponse.data.data.message}`);
        console.log(`   Создан: ${tradeResponse.data.data.createdAt}`);
        console.log('');

        // Показываем как проверить статус
        console.log('🔍 КАК ПРОВЕРИТЬ СТАТУС ТРЕЙДА:');
        console.log(`   GET /api/trades/status/${tradeResponse.data.data.tradeId}`);
        console.log('');

        // Показываем как отменить трейд
        console.log('❌ КАК ОТМЕНИТЬ ТРЕЙД:');
        console.log(`   POST /api/trades/cancel/${tradeResponse.data.data.tradeId}`);
        console.log('');

        console.log('🎉 ТРЕЙД ОФФЕР УСПЕШНО ОТПРАВЛЕН НА ДРУГОЙ АККАУНТ!');
        console.log('   Теперь нужно подтвердить трейд через Steam Mobile Authenticator');

      } else {
        console.log('❌ Ошибка создания трейд оффера:');
        console.log(`   ${tradeResponse.data.error}`);
      }

    } catch (error) {
      if (error.response) {
        console.error(`❌ HTTP ошибка: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.data) {
          console.error(`   ${error.response.data.error || error.response.data.message}`);
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.error('❌ Не удается подключиться к Steam Trade Manager');
        console.error('   Убедитесь что steam-trade-manager.js запущен на порту 3020');
      } else {
        console.error(`❌ Ошибка: ${error.message}`);
      }
    }
  }

  async checkTradeStatus(tradeId) {
    console.log(`🔍 ПРОВЕРКА СТАТУСА ТРЕЙДА: ${tradeId}`);
    console.log('─'.repeat(50));

    try {
      const response = await axios.get(`${this.baseURL}/api/trades/status/${tradeId}`);

      if (response.data.success) {
        console.log('✅ Трейд найден');
        console.log(`   Trade ID: ${response.data.data.tradeId}`);
        console.log(`   Статус: ${response.data.data.stateName} (${response.data.data.state})`);
        console.log(`   Партнер: ${response.data.data.partnerSteamId}`);
        console.log(`   Создан: ${response.data.data.created}`);
        console.log(`   Обновлен: ${response.data.data.updated}`);

        if (response.data.data.expires) {
          console.log(`   Истекает: ${response.data.data.expires}`);
        }

        console.log('');
        console.log('📊 ПРЕДМЕТЫ:');
        if (response.data.data.itemsFromMe.length > 0) {
          console.log('   Бот дает:');
          response.data.data.itemsFromMe.forEach(item => {
            console.log(`     • ${item.name} (AssetID: ${item.assetid})`);
          });
        }

        if (response.data.data.itemsFromThem.length > 0) {
          console.log('   Бот получает:');
          response.data.data.itemsFromThem.forEach(item => {
            console.log(`     • ${item.name} (AssetID: ${item.assetid})`);
          });
        }

      } else {
        console.log('❌ Трейд не найден');
        console.log(`   ${response.data.error}`);
      }

    } catch (error) {
      console.error(`❌ Ошибка: ${error.message}`);
    }
  }
}

// Использование:
// node real-trade-example.js create - создать трейд
// node real-trade-example.js status <tradeId> - проверить статус

const args = process.argv.slice(2);
const example = new RealTradeExample();

if (args[0] === 'status' && args[1]) {
  example.checkTradeStatus(args[1]);
} else {
  example.createTradeOffer();
}