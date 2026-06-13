// scripts/test-inventory.js
#!/usr/bin/env node
require('dotenv').config({ path: 'apps/backend/.env' });
const SteamAPI = require('steamapi');

const steam = new SteamAPI(process.env.STEAM_API_KEY);

async function testInventory(steamId) {
  console.log(`🔍 Testing inventory for SteamID: ${steamId}`);
  console.log(`📋 Using API Key: ${process.env.STEAM_API_KEY ? '✅ Set' : '❌ Not set'}`);
  
  try {
    // Test CS2 inventory
    const cs2Inventory = await steam.getUserInventory(steamId, '730', '2', true);
    console.log(`\n🎮 CS2 Inventory (${cs2Inventory.length} items):`);
    
    cs2Inventory.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name} - ${item.market_hash_name}`);
      console.log(`     Tradable: ${item.tradable}, Marketable: ${item.marketable}`);
    });
    
    // Test Dota 2 inventory
    const dotaInventory = await steam.getUserInventory(steamId, '570', '2', true);
    console.log(`\n⚔️ Dota 2 Inventory (${dotaInventory.length} items):`);
    
    dotaInventory.slice(0, 5).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}`);
    });
    
    console.log(`\n✅ Inventory test completed successfully!`);
    
  } catch (error) {
    console.error(`\n❌ Error fetching inventory:`, error.message);
    console.log(`💡 Tips:`);
    console.log(`   1. Check if STEAM_API_KEY is set in .env file`);
    console.log(`   2. Verify the SteamID is correct`);
    console.log(`   3. Ensure profile is public`);
    console.log(`   4. Check rate limits (Steam API has daily limits)`);
  }
}

// Проверяем аргументы командной строки
const steamId = process.argv[2];
if (!steamId) {
  console.log('Usage: node scripts/test-inventory.js <STEAM_ID>');
  console.log('Example: node scripts/test-inventory.js 76561198012345678');
  process.exit(1);
}

testInventory(steamId);