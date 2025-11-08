#!/usr/bin/env node
/**
 * Проверяем данные пользователя ENTER в базе
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function checkUserData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB подключен\n');

    const User = require('./models/User');
    
    // Проверить пользователя ENTER
    const user = await User.findOne({ steamId: '76561199257487454' });
    
    if (user) {
      console.log('=== ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ENTER ===\n');
      console.log('SteamID:', user.steamId);
      console.log('Username:', user.username);
      console.log('OAuth Token:', user.steamAccessToken ? 'ЕСТЬ' : 'НЕТ');
      console.log('');
      console.log('userInventory:', user.userInventory ? user.userInventory.length : 0, 'предметов');
      console.log('steamInventory:', user.steamInventory ? user.steamInventory.length : 0, 'предметов');
      console.log('gameInventories:', user.gameInventories ? Object.keys(user.gameInventories).length : 0, 'игр');
      console.log('');

      if (user.userInventory && user.userInventory.length > 0) {
        console.log('Примеры предметов из userInventory:');
        user.userInventory.slice(0, 3).forEach((item, i) => {
          console.log(`  ${i+1}. ${item.name}`);
          console.log(`     AppID: ${item.appid}, Tradable: ${item.tradable}`);
          console.log(`     Type: ${item.type}\n`);
        });
      }

      if (user.steamInventory && user.steamInventory.length > 0) {
        console.log('Примеры предметов из steamInventory:');
        user.steamInventory.slice(0, 3).forEach((item, i) => {
          console.log(`  ${i+1}. ${item.name}`);
          console.log(`     Tradable: ${item.tradable}, Marketable: ${item.marketable}\n`);
        });
      }
    } else {
      console.log('❌ Пользователь ENTER не найден!');
    }

    // Проверить бота
    console.log('\n=== ДАННЫЕ БОТА ===\n');
    const botUser = await User.findOne({ isBot: true });
    
    if (botUser) {
      console.log('SteamID:', botUser.steamId);
      console.log('Username:', botUser.username);
      console.log('steamInventory:', botUser.steamInventory ? botUser.steamInventory.length : 0, 'предметов');
      console.log('userInventory:', botUser.userInventory ? botUser.userInventory.length : 0, 'предметов');

      if (botUser.steamInventory && botUser.steamInventory.length > 0) {
        console.log('\nПримеры предметов бота (steamInventory):');
        botUser.steamInventory.slice(0, 3).forEach((item, i) => {
          console.log(`  ${i+1}. ${item.name}`);
          console.log(`     Tradable: ${item.tradable}, Marketable: ${item.marketable}\n`);
        });
      }
    } else {
      console.log('❌ Бот не найден!');
    }

  } catch (error) {
    console.log('❌ Ошибка:', error.message);
  }
}

checkUserData();
