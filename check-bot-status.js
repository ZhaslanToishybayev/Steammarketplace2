/**
 * Простой скрипт для проверки статуса Steam бота
 */

require('dotenv').config();
const SteamUser = require('steam-user');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkBotStatus() {
  log('blue', '\n=== ПРОВЕРКА СТАТУСА STEAM БОТА ===\n');

  const botConfig = {
    username: process.env.STEAM_BOT_1_USERNAME,
    password: process.env.STEAM_BOT_1_PASSWORD,
    sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET,
    identitySecret: process.env.STEAM_BOT_1_IDENTITY_SECRET
  };

  // Проверяем конфигурацию
  log('cyan', '1. Проверка конфигурации:');
  const checks = [
    { name: 'Username', value: botConfig.username, status: !!botConfig.username },
    { name: 'Password', value: botConfig.password ? '***' : 'НЕ УСТАНОВЛЕН', status: !!botConfig.password },
    { name: 'Shared Secret', value: botConfig.sharedSecret ? '***' : 'НЕ УСТАНОВЛЕН', status: !!botConfig.sharedSecret },
    { name: 'Identity Secret', value: botConfig.identitySecret ? '***' : 'НЕ УСТАНОВЛЕН', status: !!botConfig.identitySecret }
  ];

  checks.forEach(check => {
    const status = check.status ? '✅' : '❌';
    log(check.status ? 'green' : 'red', `   ${status} ${check.name}: ${check.value}`);
  });

  const allSet = checks.every(check => check.status);
  log(allSet ? 'green' : 'red', `\n   ${allSet ? '✅' : '❌'} Конфигурация: ${allSet ? 'ПОЛНАЯ' : 'НЕПОЛНАЯ'}\n`);

  if (!allSet) {
    log('yellow', '⚠️  Не все credentials настроены\n');
    return;
  }

  // Создаём клиент
  log('cyan', '2. Создание SteamUser клиента...');
  const client = new SteamUser({
    promptSteamGuardCode: false,
    enableChainrhinos: false
  });
  log('green', '   ✅ Клиент создан\n');

  // События
  log('cyan', '3. Подключение к Steam...\n');

  client.on('steamGuard', (domain, callback, lastCodeWrong) => {
    log('yellow', '   🔑 Требуется Steam Guard код');
    // Попытка автогенерации
    try {
      const steamTOTP = require('steam-totp');
      const code = steamTOTP.generateAuthCode(botConfig.sharedSecret);
      log('green', `   🔑 Автогенерированный код: ${code}`);
      callback(code);
    } catch (error) {
      log('red', `   ❌ Ошибка генерации кода: ${error.message}`);
      callback(null);
    }
  });

  client.on('loggedOn', (details) => {
    log('green', '\n   ✅ УСПЕШНО ВОШЛИ В STEAM!');
    log('cyan', `   👤 Аккаунт: ${details.vanityurl || details.accountName}`);
    log('cyan', `   🆔 SteamID: ${client.steamID ? client.steamID.getSteamID64() : 'Unknown'}`);
    log('cyan', `   👥 Персона: ${client.personaState}\n`);

    // Получаем инвентарь CS2
    log('cyan', '4. Получение инвентаря CS2...\n');
    log('yellow', '   ⚠️  Внимание: Для получения инвентаря требуется TradeOfferManager');
    log('yellow', '   💡 В реальном боте используется steamIntegration.getBotInventory()');
    log('yellow', '   ✅ Бот успешно подключен к Steam и готов к работе!\n');
    process.exit(0);
  });

  client.on('disconnected', (eresult, msg) => {
    log('yellow', `   ⚠️  Отключились: ${eresult} - ${msg}\n`);
  });

  client.on('error', (error) => {
    log('red', `\n   ❌ Ошибка: ${error.message}\n`);
    if (error.eresult) {
      log('red', `   Код ошибки: ${error.eresult}`);
    }
  });

  client.on('debug', (message) => {
    log('gray', `   [DEBUG] ${message}`);
  });

  // Подключаемся
  try {
    log('blue', '   Подключение...');
    client.logOn({
      accountName: botConfig.username,
      password: botConfig.password
    });
  } catch (error) {
    log('red', `\n   ❌ Ошибка подключения: ${error.message}\n`);
  }

  // Таймаут для полного подключения
  setTimeout(() => {
    if (client.steamID === null) {
      log('red', '\n   ⏰ Таймаут подключения (30 сек)\n');
      process.exit(1);
    }
  }, 30000);
}

// Функция getInventory больше не нужна - используется TradeOfferManager
// Оставлена для совместимости, но не вызывается
function getInventory(client) {
  log('yellow', '\n   ⚠️  Эта функция устарела!');
  log('yellow', '   В новых версиях SteamUser инвентарь получается через TradeOfferManager');
  log('yellow', '   Используйте: steamIntegration.getBotInventory(this.manager)\n');
}

// Запуск
checkBotStatus().catch(error => {
  log('red', `\n❌ Критическая ошибка: ${error.message}\n`);
  process.exit(1);
});
