require('dotenv').config();
const mongoose = require('mongoose');

async function clearUserInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./models/User');

    // Находим пользователя по Steam ID
    const user = await User.findOne({ steamId: '76561199257487454' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('User:', user.username);
    console.log('Current userInventory:', user.userInventory ? user.userInventory.length : 0);

    // Очищаем инвентарь
    user.userInventory = [];
    await user.save();

    console.log('✅ User inventory cleared');
    console.log('Note: Real Steam authentication required');

    process.exit(0);
  } catch (err) {
    console.log('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

clearUserInventory();
