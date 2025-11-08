const mongoose = require('mongoose');
const User = require('./models/User');

async function checkBot() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/csgo-marketplace');
    console.log('Connected to MongoDB\n');

    const bot = await User.findOne({ steamId: '76561198782060203' });
    
    if (bot) {
      console.log('=== BOT INFO ===');
      console.log('SteamID:', bot.steamId);
      console.log('Username:', bot.username);
      console.log('OAuth Token:', bot.steamAccessToken ? 'PRESENT' : 'NULL');
      console.log('Is Admin:', bot.isAdmin);
      
      if (bot.steamAccessToken) {
        console.log('Token Preview:', bot.steamAccessToken.substring(0, 20) + '...');
      }
    } else {
      console.log('Bot not found in database');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBot();
