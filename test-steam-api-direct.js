require('dotenv').config();
const axios = require('axios');

async function test() {
  const apiKey = process.env.STEAM_API_KEY;

  if (!apiKey || apiKey === 'YOUR_STEAM_API_KEY') {
    console.log('⚠️ STEAM_API_KEY не настроен в .env файле');
    console.log('Нужен реальный API ключ для проверки инвентаря\n');
    return;
  }

  console.log('✅ STEAM_API_KEY найден:', apiKey.substring(0, 10) + '...\n');

  try {
    // CS2 с API ключом
    console.log('=== CS2 (appId=730) ===');
    const cs2 = await axios.get(
      `https://steamcommunity.com/inventory/76561199257487454/730/2?l=english&count=5000&key=${apiKey}`,
      { timeout: 10000 }
    );

    console.log('Status:', cs2.status);
    console.log('Success:', cs2.data.success);
    console.log('Total Inventory Count:', cs2.data.total_inventory_count);

    if (cs2.data.assets && cs2.data.assets.length > 0) {
      console.log('Предметов в ответе:', cs2.data.assets.length);
    }

    // Dota 2 с API ключом
    console.log('\n=== Dota 2 (appId=570) ===');
    const dota2 = await axios.get(
      `https://steamcommunity.com/inventory/76561199257487454/570/2?l=english&count=5000&key=${apiKey}`,
      { timeout: 10000 }
    );

    console.log('Status:', dota2.status);
    console.log('Success:', dota2.data.success);
    console.log('Total Inventory Count:', dota2.data.total_inventory_count);

    if (dota2.data.assets && dota2.data.assets.length > 0) {
      console.log('Предметов в ответе:', dota2.data.assets.length);
      console.log('\n✅ DOTA 2 ИНВЕНТАРЬ НАЙДЕН!');
    } else {
      console.log('\n❌ Dota 2 инвентарь пуст (success=false или нет assets)');
      if (dota2.data.Error) {
        console.log('Ошибка:', dota2.data.Error);
      }
    }

  } catch (e) {
    console.log('\n❌ ОШИБКА:', e.response?.status);

    if (e.response?.data?.Error) {
      console.log('Steam API Error:', e.response.data.Error);
    }

    if (e.response?.status === 400) {
      console.log('\n💡 ПРИЧИНЫ ОШИБКИ 400:');
      console.log('1. Пользователь не владеет этой игрой');
      console.log('2. Инвентарь приватный');
      console.log('3. Игра не куплена');
      console.log('4. Нужен OAuth токен для доступа к инвентарю');
    }
  }
}

test();
