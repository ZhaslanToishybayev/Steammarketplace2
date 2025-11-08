/**
 * Скрипт для получения инвентаря Steam бота
 * Показывает все предметы в CS2 инвентаре бота
 */

require('dotenv').config();
const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');
const steamTOTP = require('steam-totp');
const logger = require('./utils/logger');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
}

async function getBotInventory() {
  log('bright', '\n═══════════════════════════════════════════════════');
  log('bright', '  🎮 ПОЛУЧЕНИЕ ИНВЕНТАРЯ STEAM БОТА');
  log('bright', '═══════════════════════════════════════════════════\n');

  // Проверка конфигурации
  const botConfig = {
    username: process.env.STEAM_BOT_1_USERNAME,
    password: process.env.STEAM_BOT_1_PASSWORD,
    sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET,
    identitySecret: process.env.STEAM_BOT_1_IDENTITY_SECRET
  };

  // Проверяем, есть ли credentials
  const hasCredentials = botConfig.username && botConfig.password;

  if (!hasCredentials) {
    log('yellow', '⚠️  Steam Bot credentials НЕ НАСТРОЕНЫ в .env файле');
    log('yellow', '\nДля получения реального инвентаря нужно:');
    log('cyan', '  1. STEAM_BOT_1_USERNAME');
    log('cyan', '  2. STEAM_BOT_1_PASSWORD');
    log('cyan', '  3. STEAM_BOT_1_SHARED_SECRET');
    log('cyan', '  4. STEAM_BOT_1_IDENTITY_SECRET\n');

    // Показываем демо инвентарь
    log('blue', '🎭 Показываю ДЕМО инвентарь...\n');
    await showDemoInventory();
    return;
  }

  // Подключаемся к Steam
  log('blue', '🔐 Подключаемся к Steam...');
  log('cyan', `   Username: ${botConfig.username}`);

  const client = new SteamUser({
    promptSteamGuardCode: false,
    disableScheduledMessages: false
  });

  const manager = new TradeOfferManager({
    steam: client,
    language: 'en',
    pollInterval: 10000,
    cancelTime: 15 * 60 * 1000
  });

  // Event handlers
  client.on('steamGuard', (domain, callback, lastCodeWrong) => {
    try {
      const code = steamTOTP.generateAuthCode(botConfig.sharedSecret);
      log('green', `   🔑 Авто Steam Guard код: ${code}`);
      callback(code);
    } catch (error) {
      log('red', `   ❌ Ошибка генерации кода: ${error.message}`);
      callback(null);
    }
  });

  client.on('loggedOn', (details) => {
    log('green', `   ✅ Вошли как: ${details.vanityurl || details.accountName}`);
  });

  client.on('disconnected', (eresult, msg) => {
    log('yellow', `   ⚠️  Отключились: ${eresult} - ${msg}`);
  });

  manager.on('steamGuard', (domain, callback, lastCodeWrong) => {
    try {
      const code = steamTOTP.generateAuthCode(botConfig.sharedSecret);
      log('green', `   🔑 Trade Guard код: ${code}`);
      callback(code);
    } catch (error) {
      callback(null);
    }
  });

  // Подключаемся
  try {
    await new Promise((resolve, reject) => {
      client.logOn({
        accountName: botConfig.username,
        password: botConfig.password
      });
      client.once('loggedOn', () => resolve());
      client.once('error', (err) => reject(err));
    });

    // Ждём готовности TradeOfferManager
    log('blue', '⏳ Ожидаем загрузки TradeOfferManager...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Получаем инвентарь
    log('blue', '📦 Получаем инвентарь CS2...\n');

    if (!manager.inventory) {
      throw new Error('Инвентарь не загружен');
    }

    const items = manager.inventory.getItems();
    log('green', `✅ Найдено предметов: ${items.length}\n`);

    if (items.length === 0) {
      log('yellow', '📭 Инвентарь пуст\n');
    } else {
      await displayInventory(items);
    }

  } catch (error) {
    log('red', `\n❌ Ошибка подключения: ${error.message}`);
    log('yellow', '\nВозможные причины:');
    log('yellow', '  1. Неверные credentials');
    log('yellow', '  2. Steam Guard требует подтверждения');
    log('yellow', '  3. Аккаунт заблокирован');
    log('yellow', '  4. Rate limiting\n');
  }

  // Выход
  try {
    client.logOff();
    log('blue', '👋 Отключились от Steam');
  } catch (error) {
    // Игнорируем ошибки при отключении
  }

  log('bright', '\n═══════════════════════════════════════════════════\n');
}

async function displayInventory(items) {
  // Фильтруем только CS2 предметы
  const cs2Items = items.filter(item => item.appId === 730);
  const totalValue = items.reduce((sum, item) => sum + (item.price || 0), 0);

  log('cyan', `🎯 Статистика инвентаря:`);
  log('cyan', `   Всего предметов: ${items.length}`);
  log('cyan', `   CS2 предметов: ${cs2Items.length}`);
  log('cyan', `   Примерная стоимость: ${formatPrice(totalValue)}\n`);

  // Группируем по категориям
  const categories = {
    'Knife': items.filter(item => item.name && item.name.toLowerCase().includes('knife')),
    'AK-47': items.filter(item => item.name && item.name.includes('AK-47')),
    'AWP': items.filter(item => item.name && item.name.includes('AWP')),
    'Glock': items.filter(item => item.name && item.name.includes('Glock')),
    'USP': items.filter(item => item.name && item.name.includes('USP')),
    'Other': items.filter(item =>
      !item.name?.toLowerCase().includes('knife') &&
      !item.name?.includes('AK-47') &&
      !item.name?.includes('AWP') &&
      !item.name?.includes('Glock') &&
      !item.name?.includes('USP')
    )
  };

  // Отображаем по категориям
  for (const [category, categoryItems] of Object.entries(categories)) {
    if (categoryItems.length === 0) continue;

    log('bright', `${category} (${categoryItems.length})`);
    log('bright', '─'.repeat(60));

    categoryItems.slice(0, 10).forEach((item, index) => {
      const wear = item.cached ? ` (${item.cached})` : '';
      const tradable = item.tradable ? '✅' : '❌';
      const marketable = item.marketable ? '💰' : '🚫';

      log('white', `  ${index + 1}. ${item.name || 'Unknown'}${wear}`);
      log('gray', `     AssetID: ${item.assetid} | Tradable: ${tradable} | Market: ${marketable}`);
      log('gray', `     ClassID: ${item.classid} | InstanceID: ${item.instanceid}\n`);
    });

    if (categoryItems.length > 10) {
      log('yellow', `  ... и ещё ${categoryItems.length - 10} предметов\n`);
    }

    log('reset', '');
  }

  // Показываем топ 5 самых дорогих
  const topItems = [...items]
    .sort((a, b) => (b.price || 0) - (a.price || 0))
    .slice(0, 5);

  if (topItems.length > 0) {
    log('bright', '\n💎 Топ 5 самых дорогих предметов:');
    log('bright', '─'.repeat(60));
    topItems.forEach((item, index) => {
      log('magenta', `  ${index + 1}. ${item.name || 'Unknown'}`);
      log('green', `     Стоимость: ${formatPrice(item.price || 0)}`);
      log('gray', `     AssetID: ${item.assetid}\n`);
    });
  }
}

async function showDemoInventory() {
  // Демо инвентарь с популярными скинами
  const demoItems = [
    { name: 'AK-47 | Redline (Field-Tested)', assetid: '12345', price: 45.99, tradable: true, marketable: true, appid: 730 },
    { name: 'AWP | Dragon Lore (Factory New)', assetid: '12346', price: 1250.50, tradable: true, marketable: true, appid: 730 },
    { name: 'M4A4 | Howl (Minimal Wear)', assetid: '12347', price: 2150.00, tradable: true, marketable: true, appid: 730 },
    { name: 'Karambit | Fade (Factory New)', assetid: '12348', price: 850.75, tradable: true, marketable: true, appid: 730 },
    { name: 'AK-47 | Fire Serpent (Field-Tested)', assetid: '12349', price: 320.25, tradable: true, marketable: true, appid: 730 },
    { name: 'AWP | Asiimov (Minimal Wear)', assetid: '12350', price: 180.50, tradable: true, marketable: true, appid: 730 },
    { name: 'Glock-18 | Fade (Factory New)', assetid: '12351', price: 95.30, tradable: true, marketable: true, appid: 730 },
    { name: 'USP-S | Kill Confirmed (Minimal Wear)', assetid: '12352', price: 145.80, tradable: true, marketable: true, appid: 730 },
    { name: 'Desert Eagle | Printstream (Factory New)', assetid: '12353', price: 220.40, tradable: true, marketable: true, appid: 730 },
    { name: 'AK-47 | Neon Rider (Field-Tested)', assetid: '12354', price: 65.90, tradable: true, marketable: true, appid: 730 },
  ];

  const totalValue = demoItems.reduce((sum, item) => sum + item.price, 0);

  log('cyan', `🎯 Статистика ДЕМО инвентаря:`);
  log('cyan', `   Всего предметов: ${demoItems.length}`);
  log('cyan', `   CS2 предметов: ${demoItems.length}`);
  log('cyan', `   Примерная стоимость: ${formatPrice(totalValue)}\n`);

  log('bright', '🎮 СКИНЫ В ИНВЕНТАРЕ:');
  log('bright', '═'.repeat(60));

  demoItems.forEach((item, index) => {
    log('white', `  ${index + 1}. ${item.name}`);
    log('green', `     💰 Цена: ${formatPrice(item.price)}`);
    log('gray', `     🔑 AssetID: ${item.assetid}`);
    log('gray', `     ✅ Tradable: Да | 💰 Marketable: Да\n`);
  });

  log('bright', '═'.repeat(60));
  log('magenta', `\n💎 Общая стоимость инвентаря: ${formatPrice(totalValue)}\n`);

  log('yellow', '⚠️  Это демо данные! Для реального инвентаря настройте Steam Bot credentials.\n');
}

// Запуск
if (require.main === module) {
  getBotInventory()
    .then(() => {
      log('green', '\n✅ Готово!\n');
      process.exit(0);
    })
    .catch((error) => {
      log('red', `\n❌ Ошибка: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

module.exports = getBotInventory;
