#!/usr/bin/env node
/**
 * Тест множественного инвентаря по играм
 * Проверяет, что бот загружает отдельные инвентари для CS2 и Dota 2
 */

require('dotenv').config();
const SteamBotManager = require('./services/steamBotManager');

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

async function testMultiGameInventory() {
  log('blue', '\n=== ТЕСТ МНОЖЕСТВЕННОГО ИНВЕНТАРЯ ПО ИГРАМ ===\n');

  try {
    // Инициализируем бота
    const botManager = new SteamBotManager();
    await botManager.initialize();

    log('cyan', 'Ботов инициализировано: ' + botManager.activeBots.length);

    if (botManager.activeBots.length === 0) {
      log('red', '❌ Нет активных ботов!');
      process.exit(1);
    }

    const bot = botManager.activeBots[0];
    log('cyan', 'Бот онлайн: ' + bot.isOnline);

    // Проверяем новую структуру инвентаря
    log('\n' + '=== СТРУКТУРА ИНВЕНТАРЯ ==='.blue);
    log('cyan', 'bot.inventory =', JSON.stringify(bot.inventory, null, 2));

    if (!bot.inventory || Object.keys(bot.inventory).length === 0) {
      log('red', '❌ Инвентарь пуст или неправильно инициализирован!');
      process.exit(1);
    }

    // Проверяем CS2 инвентарь
    log('\n' + '=== CS2 ИНВЕНТАРЬ (appId=730) ==='.blue);
    const cs2Items = bot.inventory['730'] || [];
    log('green', 'CS2 предметов: ' + cs2Items.length);

    if (cs2Items.length > 0) {
      cs2Items.forEach((item, i) => {
        log('yellow', `  ${i+1}. ${item.name || 'Unknown'}`);
        log('cyan', `     AssetID: ${item.assetid || item.id}`);
        log('cyan', `     AppID: ${item.appid}`);
        log('cyan', `     Tradable: ${item.tradable}`);
        log('cyan', `     Marketable: ${item.marketable}`);
        log('cyan', `     Тип: ${item.type}\n`);
      });
    }

    // Проверяем Dota 2 инвентарь
    log('\n' + '=== DOTA 2 ИНВЕНТАРЬ (appId=570) ==='.blue);
    const dota2Items = bot.inventory['570'] || [];
    log('green', 'Dota 2 предметов: ' + dota2Items.length);

    if (dota2Items.length > 0) {
      dota2Items.forEach((item, i) => {
        log('yellow', `  ${i+1}. ${item.name || 'Unknown'}`);
        log('cyan', `     AssetID: ${item.assetid || item.id}`);
        log('cyan', `     AppID: ${item.appid}`);
        log('cyan', `     Tradable: ${item.tradable}`);
        log('cyan', `     Marketable: ${item.marketable}`);
        log('cyan', `     Тип: ${item.type}\n`);
      });
    } else {
      log('cyan', '  (пусто - у бота нет Dota 2 предметов)');
    }

    // Проверяем, что нет смешивания
    log('\n' + '=== ПРОВЕРКА КОРРЕКТНОСТИ ==='.blue);

    // Проверяем, что в CS2 инвентаре только CS2 предметы
    const nonCs2InCs2 = cs2Items.filter(item => item.appid !== 730);
    if (nonCs2InCs2.length > 0) {
      log('red', '❌ ОШИБКА: Найдены non-CS2 предметы в CS2 инвентаре!');
      process.exit(1);
    } else {
      log('green', '✅ Корректно: В CS2 инвентаре только CS2 предметы');
    }

    // Проверяем, что в Dota 2 инвентаре только Dota 2 предметы
    const nonDota2InDota2 = dota2Items.filter(item => item.appid !== 570);
    if (nonDota2InDota2.length > 0) {
      log('red', '❌ ОШИБКА: Найдены non-Dota 2 предметы в Dota 2 инвентаре!');
      process.exit(1);
    } else {
      log('green', '✅ Корректно: В Dota 2 инвентаре только Dota 2 предметы');
    }

    // Проверяем статус бота
    log('\n' + '=== СТАТУС БОТА ==='.blue);
    const status = bot.getStatus();
    log('cyan', JSON.stringify(status, null, 2));

    log('\n' + '🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!'.green);
    log('cyan', '\nИтог:');
    log('cyan', `  ✅ Бот загружает отдельные инвентари для каждой игры`);
    log('cyan', `  ✅ CS2: ${cs2Items.length} предметов (appId=730)`);
    log('cyan', `  ✅ Dota 2: ${dota2Items.length} предметов (appId=570)`);
    log('cyan', `  ✅ Смешивания нет`);
    log('cyan', `  ✅ Архитектура множественного инвентаря работает корректно!`);

    process.exit(0);
  } catch (error) {
    log('red', '❌ Ошибка: ' + error.message);
    console.error(error);
    process.exit(1);
  }
}

testMultiGameInventory();
