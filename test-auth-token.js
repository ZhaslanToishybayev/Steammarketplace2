require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/steam-marketplace');

    const user = await User.findOne({ username: 'ENTER' });
    if (!user) {
      console.log('User not found');
      return;
    }

    const token = jwt.sign(
      { id: user._id, steamId: user.steamId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Token created for user:', user.username);
    console.log('SteamID:', user.steamId);
    console.log('Token:', token);

  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await mongoose.disconnect();
  }
}

test();
