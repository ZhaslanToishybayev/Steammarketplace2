require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const steamIntegration = require('./services/steamIntegrationService');
const jwt = require('jsonwebtoken');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/steam-marketplace');

    const user = await User.findOne({ steamId: '76561199257487454' });
    if (!user) {
      console.log('User not found');
      return;
    }

    const token = jwt.sign(
      { id: user._id, steamId: user.steamId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('=== ТЕСТ STEAM INTEGRATION SERVICE ===\n');
    console.log('User:', user.username);
    console.log('SteamID:', user.steamId);
    console.log('Access Token:', user.steamAccessToken ? 'YES' : 'NO');
    console.log('');

    // Test CS2
    console.log('--- CS2 (appId=730) ---');
    try {
      const cs2Result = await steamIntegration.getInventory(user.steamId, 730, user.steamAccessToken);
      console.log('Success:', cs2Result.success);
      console.log('Items:', cs2Result.items ? cs2Result.items.length : 0);
      console.log('Cached:', cs2Result.cached);
    } catch (e) {
      console.log('ERROR:', e.message);
    }
    console.log('');

    // Test Dota 2
    console.log('--- Dota 2 (appId=570) ---');
    try {
      const dota2Result = await steamIntegration.getInventory(user.steamId, 570, user.steamAccessToken);
      console.log('Success:', dota2Result.success);
      console.log('Items:', dota2Result.items ? dota2Result.items.length : 0);
      console.log('Cached:', dota2Result.cached);
    } catch (e) {
      console.log('ERROR:', e.message);
    }

  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await mongoose.disconnect();
  }
}

test();
