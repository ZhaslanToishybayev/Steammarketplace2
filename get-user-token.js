#!/usr/bin/env node
/**
 * Получить токен для пользователя ENTER
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function getUserToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = require('./models/User');

    // Находим пользователя ENTER
    const user = await User.findOne({ steamId: '76561199257487454' });
    if (!user) {
      console.log('❌ User ENTER not found');
      process.exit(1);
    }

    console.log('User:', user.username);
    console.log('SteamID:', user.steamId);
    console.log('Has userInventory:', !!(user.userInventory && user.userInventory.length > 0));

    // Генерируем JWT токен
    const token = jwt.sign(
      { id: user._id, steamId: user.steamId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('\n✅ JWT Token for user ENTER:');
    console.log(token);

    process.exit(0);
  } catch (err) {
    console.log('❌ Error:', err.message);
    process.exit(1);
  }
}

getUserToken();
