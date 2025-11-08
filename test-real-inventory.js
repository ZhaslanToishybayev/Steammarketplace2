require('dotenv').config();
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const TradeOfferManager = require('steam-tradeoffer-manager');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(colors[color] + message + colors.reset);
}

async function testRealInventory() {
  log('blue', '\n=== ПРОВЕРКА РЕАЛЬНОГО ИНВЕНТАРЯ ===\n');

  const config = {
    accountName: process.env.STEAM_BOT_1_USERNAME,
    password: process.env.STEAM_BOT_1_PASSWORD,
    sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET
  };

  log('cyan', 'Бот: ' + config.accountName);

  const client = new SteamUser({ 
    promptSteamGuardCode: false,
    enableChainrhinos: false
  });

  const manager = new TradeOfferManager({ 
    steam: client, 
    domain: 'localhost',
    language: 'en'
  });

  // Инициализируем manager
  client.on('logOnSuccess', () => {
    manager.setCookies(null, (err) => {
      if (err) {
        log('red', 'Ошибка cookies: ' + err.message);
        return;
      }

      log('green', 'Cookies установлены!\n');
      log('cyan', 'Загружаем инвентарь...\n');

      manager.getInventoryContents(730, 2, true, (err, inventory) => {
        if (err) {
          log('red', 'Ошибка: ' + err.message);
          process.exit(1);
        }

        log('green', '✅ Инвентарь получен!');
        log('cyan', 'Предметов: ' + inventory.length);

        if (inventory.length > 0) {
          log('\ncyan', 'Примеры:');
          inventory.slice(0, 5).forEach((item, i) => {
            log('yellow', '  ' + (i+1) + '. ' + item.name);
            log('cyan', '     AssetID: ' + item.assetid);
            log('cyan', '     Tradable: ' + (item.isTradable() ? 'Да' : 'Нет') + '\n');
          });
          log('green', '✅ РЕАЛЬНЫЙ БОТ С РЕАЛЬНЫМ ИНВЕНТАРЕМ!');
        } else {
          log('\nyellow', 'Инвентарь пуст (но это РЕАЛЬНЫЙ бот!)');
        }
        
        process.exit(0);
      });
    });
  });

  client.on('steamGuard', (domain, callback) => {
    const code = SteamTotp.generateAuthCode(config.sharedSecret);
    log('yellow', 'Код: ' + code);
    callback(code);
  });

  client.logOn({ accountName: config.accountName, password: config.password });
}

testRealInventory().catch(e => log('red', e.message));
