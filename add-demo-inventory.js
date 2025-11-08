const mongoose = require('mongoose');
const User = require('./models/User');

async function addDemoData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/csgo-marketplace');
    console.log('Connected to MongoDB\n');

    const bot = await User.findOne({ steamId: '76561198782060203' });
    
    if (bot) {
      // Добавляем демо инвентарь бота
      bot.steamInventory = [
        {
          assetId: '27202924837',
          marketName: 'AK-47 | Redline (Field-Tested)',
          iconUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class_730/27202924837/200x200',
          price: 45.99,
          float: 0.32,
          tradable: true,
          marketable: true
        },
        {
          assetId: '27202924838',
          marketName: 'AWP | Asiimov (Field-Tested)',
          iconUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class_730/27202924838/200x200',
          price: 189.99,
          float: 0.18,
          tradable: true,
          marketable: true
        },
        {
          assetId: '27202924839',
          marketName: 'M4A1-S | Hyper Beast (Field-Tested)',
          iconUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class_730/27202924839/200x200',
          price: 67.50,
          float: 0.24,
          tradable: true,
          marketable: true
        }
      ];
      
      // Добавляем демо инвентарь пользователя
      bot.userInventory = [
        {
          assetId: '27202924840',
          marketName: 'AK-47 | Fire Serpent (Field-Tested)',
          iconUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class_730/27202924840/200x200',
          price: 299.99,
          float: 0.41,
          tradable: true,
          marketable: true
        },
        {
          assetId: '27202924841',
          marketName: 'Karambit | Fade (Factory New)',
          iconUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class_730/27202924841/200x200',
          price: 1299.99,
          float: 0.06,
          tradable: true,
          marketable: true
        }
      ];
      
      await bot.save();
      
      console.log('=== DEMO DATA ADDED ===');
      console.log('Bot inventory items:', bot.steamInventory.length);
      console.log('User inventory items:', bot.userInventory.length);
      console.log('\n✅ Demo data added successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addDemoData();
