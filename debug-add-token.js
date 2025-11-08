// Debug script to add OAuth token to test user
const mongoose = require('mongoose');
const User = require('./models/User');

async function addToken() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/csgo-marketplace');
    console.log('Connected to MongoDB');

    // Find or create test user
    let user = await User.findOne({ steamId: '76561198782060203' });

    if (!user) {
      console.log('Creating test user...');
      user = new User({
        steamId: '76561198782060203',
        steamName: 'TestUser',
        username: 'TestUser',
        displayName: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        profileUrl: 'https://steamcommunity.com/id/testuser',
        isAdmin: true,
        steamAccessToken: 'demo-oauth-token'
      });
      await user.save();
      console.log('Test user created');
    } else {
      // Add demo OAuth token
      user.steamAccessToken = 'demo-oauth-token';
      await user.save();
    }

    console.log(`OAuth token added successfully for user: ${user.username}`);
    console.log(`Token: ${user.steamAccessToken}`);

    process.exit(0);
  } catch (error) {
    console.error('Error adding token:', error);
    process.exit(1);
  }
}

addToken();
