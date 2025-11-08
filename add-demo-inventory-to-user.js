#!/usr/bin/env node
/**
 * Добавить демо-инвентарь пользователю ENTER
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function addDemoInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = require('./models/User');

    // Находим пользователя
    const user = await User.findOne({ steamId: '76561199257487454' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('User:', user.username);

    // Создаем демо-инвентарь
    user.userInventory = [
      {
        assetid: '1111111111',
        classid: '22222222',
        instanceid: '33333333',
        appid: 730,
        name: 'AK-47 | Redline (Field-Tested)',
        market_name: 'AK-47 | Redline (Field-Tested)',
        type: 'Classified Rifle',
        tradable: true,
        marketable: true,
        market_tradable_restriction: 7,
        commodity: 0,
        market_marketable_restriction: 0,
        descriptions: [],
        tags: [
          { category: 'Type', internal_name: 'Type_Rifle', name: 'Rifle' },
          { category: 'Weapon', internal_name: 'weapon_ak47', name: 'AK-47' },
          { category: 'Quality', internal_name: 'quality_community', name: 'Community' },
          { category: 'Exterior', internal_name: 'WearCategory2', name: 'Field-Tested' }
        ]
      },
      {
        assetid: '4444444444',
        classid: '55555555',
        instanceid: '66666666',
        appid: 730,
        name: 'AWP | Dragon Lore',
        market_name: 'AWP | Dragon Lore (Factory New)',
        type: 'Covert Sniper Rifle',
        tradable: true,
        marketable: true,
        market_tradable_restriction: 7,
        commodity: 0,
        market_marketable_restriction: 0,
        descriptions: [],
        tags: [
          { category: 'Type', internal_name: 'Type_SniperRifle', name: 'Sniper Rifle' },
          { category: 'Weapon', internal_name: 'weapon_awp', name: 'AWP' },
          { category: 'Quality', internal_name: 'quality_community', name: 'Community' },
          { category: 'Exterior', internal_name: 'WearCategory1', name: 'Factory New' }
        ]
      }
    ];

    await user.save();

    console.log('✅ Demo inventory added to user ENTER');
    console.log('Items:', user.userInventory.length);

    process.exit(0);
  } catch (err) {
    console.log('❌ Error:', err.message);
    process.exit(1);
  }
}

addDemoInventory();
