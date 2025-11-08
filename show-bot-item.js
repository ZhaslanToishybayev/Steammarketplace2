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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(color, message) {
  console.log(colors[color] + message + colors.reset);
}

async function showBotItem() {
  log('blue', '\n=== ИНВЕНТАРЬ БОТА Sgovt1 ===\n');

  const config = {
    accountName: process.env.STEAM_BOT_1_USERNAME,
    password: process.env.STEAM_BOT_1_PASSWORD,
    sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET
  };

  const client = new SteamUser({
    promptSteamGuardCode: false,
    enableChainrhinos: false
  });

  const manager = new TradeOfferManager({
    steam: client,
    domain: 'localhost',
    language: 'en'
  });

  client.on('logOnSuccess', () => {
    log('cyan', '✅ Бот подключился к Steam');
    log('cyan', '📡 Получаем инвентарь...\n');

    manager.setCookies(null, (err) => {
      if (err) {
        log('red', '❌ Ошибка cookies: ' + err.message);
        process.exit(1);
      }

      // Используем исправленный метод
      manager.getInventoryContents(730, 2, true, (err, inventory) => {
        if (err) {
          log('red', '❌ Ошибка: ' + err.message);
          process.exit(1);
        }

        log('green', '✅ Инвентарь получен!');
        log('cyan', '📦 Всего предметов: ' + inventory.length + '\n');

        if (inventory.length > 0) {
          log('magenta', '═══════════════════════════════════════');
          log('yellow', '        ПРЕДМЕТ В ИНВЕНТАРЕ БОТА');
          log('magenta', '═══════════════════════════════════════\n');

          inventory.forEach((item, i) => {
            log('cyan', `Предмет #${i + 1}:`);
            log('yellow', `  Название: ${item.name}`);
            log('cyan', `  AssetID: ${item.assetid}`);
            log('cyan', `  ClassID: ${item.classid}`);
            log('cyan', `  InstanceID: ${item.instanceid}`);
            log('cyan', `  Торговый: ${item.tradable ? 'Да ✅' : 'Нет ❌'}`);
            log('cyan', `  Рыночный: ${item.marketable ? 'Да ✅' : 'Нет ❌'}`);

            if (item.type) {
              log('cyan', `  Тип: ${item.type}`);
            }

            if (item.tags && item.tags.length > 0) {
              log('cyan', '  Теги:');
              item.tags.forEach(tag => {
                log('blue', `    - ${tag.category}: ${tag.name || tag.localized_tag_name}`);
              });
            }

            log('cyan', `  Контекст ID: ${item.contextid}`);
            log('cyan', `  App ID: ${item.appid}\n`);
          });

          log('magenta', '═══════════════════════════════════════');
          log('green', '✅ БОТ РАБОТАЕТ И ИМЕЕТ РЕАЛЬНЫЕ ПРЕДМЕТЫ!');
          log('magenta', '═══════════════════════════════════════\n');
        } else {
          log('yellow', '⚠️  Инвентарь пуст (но бот реальный!)');
        }

        process.exit(0);
      });
    });
  });

  client.on('steamGuard', (domain, callback) => {
    const code = SteamTotp.generateAuthCode(config.sharedSecret);
    log('yellow', '🔐 Код Steam Guard: ' + code);
    callback(code);
  });

  log('cyan', '🔄 Подключение к Steam...');
  client.logOn({
    accountName: config.accountName,
    password: config.password
  });
}

showBotItem().catch(e => log('red', 'Ошибка: ' + e.message));
