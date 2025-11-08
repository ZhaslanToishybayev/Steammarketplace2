/**
 * 🔄 ФОНОВЫЙ МОНИТОРИНГ STEAM БОТА
 * Проверяет каждые 10 минут, снялся ли rate limit
 */

require('dotenv').config();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Конфигурация
const CONFIG = {
  CHECK_INTERVAL: 10 * 60 * 1000,  // 10 минут
  LOG_FILE: 'steam-monitor.log',
  MAX_RETRIES: 100,  // Максимум попыток
  START_APP_ON_SUCCESS: true
};

// Цвета для консоли
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
  const timestamp = new Date().toISOString();
  const coloredMessage = colors[color] + message + colors.reset;
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Вывод в консоль
  console.log(coloredMessage);
  
  // Запись в лог
  fs.appendFileSync(CONFIG.LOG_FILE, logMessage);
}

function logSuccess(message) {
  log('green', `✅ ${message}`);
}

function logError(message) {
  log('red', `❌ ${message}`);
}

function logInfo(message) {
  log('cyan', `ℹ️  ${message}`);
}

function logWarning(message) {
  log('yellow', `⚠️  ${message}`);
}

// Проверка MongoDB
async function checkMongoDB() {
  return new Promise((resolve) => {
    const mongoose = require('mongoose');
    
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/steam-marketplace')
      .then(() => {
        logSuccess('MongoDB подключена');
        mongoose.disconnect();
        resolve(true);
      })
      .catch((err) => {
        logError('MongoDB недоступна: ' + err.message);
        resolve(false);
      });
  });
}

// Проверка Steam бота
async function checkSteamBot() {
  return new Promise((resolve) => {
    logInfo('Проверка Steam бота...');
    
    const script = `
require('dotenv').config();
const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');
const steamTOTP = require('steam-totp');

const config = {
  accountName: process.env.STEAM_BOT_1_USERNAME,
  password: process.env.STEAM_BOT_1_PASSWORD,
  sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET
};

const client = new SteamUser({ promptSteamGuardCode: false });

client.on('steamGuard', (domain, callback) => {
  try {
    const code = steamTOTP.generateAuthCode(config.sharedSecret);
    console.log('GUARD_CODE:' + code);
    callback(code);
  } catch (error) {
    callback(null);
  }
});

client.on('webSession', (sessionID, cookies) => {
  console.log('SUCCESS:webSession received');
  
  const manager = new TradeOfferManager({ steam: client, domain: 'localhost' });
  
  manager.setCookies(cookies, (err) => {
    if (err) {
      console.log('ERROR:Failed to set cookies: ' + err.message);
      process.exit(1);
    }
    
    console.log('SUCCESS:Cookies set');
    
    manager.getInventoryContents(730, 2, true, (err, inventory) => {
      if (err) {
        console.log('ERROR:Inventory error: ' + err.message);
        process.exit(1);
      }
      
      console.log('SUCCESS:Inventory loaded: ' + inventory.length + ' items');
      process.exit(0);
    });
  });
});

client.on('error', (error) => {
  console.log('ERROR:' + error.message);
  process.exit(1);
});

client.logOn({ accountName: config.accountName, password: config.password });

// Таймаут 45 секунд
setTimeout(() => {
  console.log('TIMEOUT:Connection timeout');
  process.exit(1);
}, 45000);
`;

    const testScript = path.join(__dirname, 'temp-bot-check.js');
    fs.writeFileSync(testScript, script);
    
    const child = spawn('node', [testScript]);
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      // Удаляем временный файл
      try {
        fs.unlinkSync(testScript);
      } catch (e) {}
      
      const fullOutput = output + errorOutput;
      
      if (code === 0 && fullOutput.includes('SUCCESS:webSession received')) {
        const inventoryMatch = fullOutput.match(/SUCCESS:Inventory loaded: (\d+) items/);
        const inventoryCount = inventoryMatch ? parseInt(inventoryMatch[1]) : 0;
        
        resolve({ 
          success: true, 
          inventoryCount,
          message: 'Бот работает! Инвентарь: ' + inventoryCount + ' предметов'
        });
      } else {
        const errorMatch = fullOutput.match(/ERROR:(.+)/);
        const errorMsg = errorMatch ? errorMatch[1] : 'Неизвестная ошибка';
        
        resolve({ 
          success: false, 
          error: errorMsg,
          message: 'Rate limit еще действует: ' + errorMsg
        });
      }
    });
  });
}

// Запуск основного приложения
function startMainApp() {
  logInfo('🚀 Запуск основного приложения...');
  
  const appProcess = spawn('npm', ['start'], {
    stdio: 'inherit',
    detached: true
  });
  
  appProcess.unref();
  
  logSuccess('Приложение запущено в фоне');
}

// Основной цикл
let retryCount = 0;
let consecutiveFailures = 0;

async function checkLoop() {
  retryCount++;
  
  logInfo(`=== Попытка #${retryCount} ===`);
  
  // Проверяем MongoDB
  const dbOk = await checkMongoDB();
  if (!dbOk) {
    logWarning('MongoDB недоступна, пропускаем проверку бота');
    setTimeout(checkLoop, CONFIG.CHECK_INTERVAL);
    return;
  }
  
  // Проверяем Steam бота
  const result = await checkSteamBot();
  
  if (result.success) {
    consecutiveFailures = 0;
    logSuccess(result.message);
    
    if (CONFIG.START_APP_ON_SUCCESS) {
      startMainApp();
    }
    
    logSuccess('🎉 STEAM BOT ГОТОВ К РАБОТЕ!');
    logSuccess('📦 Инвентарь загружен: ' + result.inventoryCount + ' предметов');
    logSuccess('💼 Можно запускать торговлю!');
    
    // Завершаем мониторинг
    logInfo('Мониторинг завершен. Бот работает!');
    process.exit(0);
  } else {
    consecutiveFailures++;
    logWarning(result.message);
    
    if (consecutiveFailures % 5 === 0) {
      logWarning(`⏰ Неудачных попыток подряд: ${consecutiveFailures}`);
    }
    
    if (retryCount >= CONFIG.MAX_RETRIES) {
      logError('Достигнуто максимальное количество попыток (100)');
      logError('Попробуйте позже вручную');
      process.exit(1);
    }
    
    setTimeout(checkLoop, CONFIG.CHECK_INTERVAL);
  }
}

// Обработка сигналов
process.on('SIGINT', () => {
  logWarning('Мониторинг остановлен пользователем');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logWarning('Мониторинг завершен');
  process.exit(0);
});

// Запуск
log('bright', '\n🔄 STEAM BOT МОНИТОРИНГ ЗАПУЩЕН');
log('cyan', 'Интервал проверки: ' + (CONFIG.CHECK_INTERVAL / 60000) + ' минут');
log('cyan', 'Лог файл: ' + CONFIG.LOG_FILE);
log('cyan', 'Остановить: Ctrl+C\n');

checkLoop();
