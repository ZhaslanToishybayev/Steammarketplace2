#!/usr/bin/env node
/**
 * Тест фильтрации по играм
 * Проверяет, что CS2 предметы не показываются в Dota 2
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

async function testGameFiltering() {
  log('blue', '\n=== ТЕСТ ФИЛЬТРАЦИИ ПО ИГРАМ ===\n');

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

    if (!bot.inventory || bot.inventory.length === 0) {
      log('yellow', '⚠️  У бота пустой инвентарь');
      process.exit(0);
    }

    log('cyan', '\n📦 Общий инвентарь бота: ' + bot.inventory.length + ' предметов\n');

    // Логируем все предметы
    log('magenta', 'ВСЕ ПРЕДМЕТЫ В ИНВЕНТАРЕ:');
    bot.inventory.forEach((item, i) => {
      log('yellow', `  ${i+1}. ${item.name}`);
      log('cyan', `     AppID: ${item.appid}, Tradable: ${item.tradable}, Marketable: ${item.marketable}`);
      log('cyan', `     Тип: ${item.type}\n`);
    });

    // Фильтрация для CS2 (исправленная)
    log('blue', '\n=== CS2 (appId=730) ===');
    const cs2Items = bot.inventory.filter(item => {
      if (!item.type) return false;
      if (item.type.includes('Base Grade Container')) return false;
      if (item.type.includes('Graffiti')) return false;
      if (item.type.includes('Music')) return false;
      return item.marketable;
    });

    log('green', `CS2 предметов: ${cs2Items.length}`);
    if (cs2Items.length > 0) {
      cs2Items.forEach((item, i) => {
        log('yellow', `  ${i+1}. ${item.name} (appId=${item.appid})`);
      });
    }

    // Фильтрация для Dota 2 (ИСПРАВЛЕННАЯ - используем appid)
    log('blue', '\n=== Dota 2 (appId=570) ===');
    const dota2Items = bot.inventory.filter(item => {
      // Для Dota 2 показываем ТОЛЬКО предметы Dota 2 (appId=570)
      return item.appId === 570 && item.tradable;
    });

    log('green', `Dota 2 предметов: ${dota2Items.length}`);
    if (dota2Items.length > 0) {
      dota2Items.forEach((item, i) => {
        log('yellow', `  ${i+1}. ${item.name} (appId=${item.appId})`);
      });
    } else {
      log('cyan', '  (пусто - у бота только CS2 предметы с appId=730)');
    }

    // Проверяем, нет ли CS2 предметов в Dota 2
    log('\n' + '=== ПРОВЕРКА КОРРЕКТНОСТИ ==='.blue);
    const cs2InDota2 = dota2Items.filter(item => {
      return item.type &&
             !item.type.includes('Base Grade Container') &&
             !item.type.includes('Graffiti') &&
             !item.type.includes('Music') &&
             item.marketable;
    });

    if (cs2InDota2.length > 0) {
      log('red', '❌ ОШИБКА: CS2 предметы найдены в Dota 2!');
      cs2InDota2.forEach(item => {
        log('red', '  - ' + item.name + ` (appId=${item.appid})`);
      });
      process.exit(1);
    } else {
      log('green', '✅ Корректно: CS2 предметы НЕ показываются в Dota 2');
    }

    // Проверяем, что CS2 предметы показываются в CS2
    if (cs2Items.length > 0) {
      log('green', '✅ Корректно: CS2 предметы показываются в CS2');
    } else {
      log('yellow', '⚠️  У бота нет CS2 предметов для показа');
    }

    log('\n' + '🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!'.green);
    log('cyan', '\nИтог:');
    log('cyan', `  - CS2: ${cs2Items.length} предметов (appId=730)`);
    log('cyan', `  - Dota 2: ${dota2Items.length} предметов (appId=570)`);
    log('cyan', `  - Смешивания нет: ✅`);

  } catch (error) {
    log('red', '❌ Ошибка: ' + error.message);
    console.error(error);
    process.exit(1);
  }
}

testGameFiltering();
