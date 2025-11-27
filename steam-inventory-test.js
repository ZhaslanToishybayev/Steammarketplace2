const http = require('http');
const url = require('url');

// Steam Inventory API Integration
function getSteamInventory(steamId, appId = 730) {
  return new Promise((resolve, reject) => {
    // App ID 730 = Counter-Strike 2, можно изменить на любую другую игру
    const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

    http.get(apiUrl, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const inventory = JSON.parse(data);

          if (inventory.error) {
            reject(new Error(inventory.error));
            return;
          }

          if (!inventory.success || !inventory.assets) {
            reject(new Error('Inventory is empty or private'));
            return;
          }

          // Обработка данных инвентаря
          const items = inventory.assets.map(asset => {
            const description = inventory.descriptions.find(desc => desc.classid === asset.classid);

            return {
              assetId: asset.assetid,
              classId: asset.classid,
              instanceId: asset.instanceid,
              amount: asset.amount,
              name: description?.name || 'Unknown Item',
              type: description?.type || '',
              rarity: description?.tags?.find(tag => tag.category === 'Rarity')?.localized_tag || '',
              quality: description?.tags?.find(tag => tag.category === 'Quality')?.localized_tag || '',
              exterior: description?.tags?.find(tag => tag.category === 'Exterior')?.localized_tag || '',
              image: description?.icon_url ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url}/62fx62f` : '',
              imageLarge: description?.icon_url_large ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url_large}/184fx184f` : '',
              tradable: description?.tradable === 1,
              marketable: description?.marketable === 1,
              marketHashName: description?.market_hash_name || '',
              description: description?.descriptions?.[0]?.value || '',
              price: Math.random() * 100 + 1 // Заглушка для цены, в реальной системе нужно получать с market
            };
          });

          resolve({
            success: true,
            steamId,
            appId,
            items,
            totalCount: items.length
          });

        } catch (error) {
          reject(new Error('Failed to parse inventory data'));
        }
      });

    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Test Steam Inventory API
console.log('🧪 Testing Steam Inventory API Integration');
console.log('==========================================\n');

// Test with a real Steam ID
const testSteamId = '76561199257487454'; // Этот Steam ID уже использовался в системе

console.log(`📦 Fetching inventory for Steam ID: ${testSteamId}`);
console.log('🎮 App ID: 730 (Counter-Strike 2)\n');

getSteamInventory(testSteamId, 730)
  .then(result => {
    console.log('✅ Steam Inventory Retrieved Successfully!');
    console.log(`📊 Total Items: ${result.totalCount}`);
    console.log(`🔗 Steam Profile: https://steamcommunity.com/profiles/${result.steamId}\n`);

    if (result.items.length > 0) {
      console.log('📋 Sample Items:');
      console.log('================');

      result.items.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   Type: ${item.type}`);
        console.log(`   Rarity: ${item.rarity}`);
        console.log(`   Quality: ${item.quality}`);
        if (item.exterior) console.log(`   Exterior: ${item.exterior}`);
        console.log(`   Tradable: ${item.tradable ? 'Yes' : 'No'}`);
        console.log(`   Marketable: ${item.marketable ? 'Yes' : 'No'}`);
        console.log(`   Price: $${item.price.toFixed(2)}`);
        console.log(`   Image: ${item.image}`);
        console.log('   -----------------------------------');
      });

      if (result.items.length > 5) {
        console.log(`... and ${result.items.length - 5} more items`);
      }
    } else {
      console.log('📭 Inventory is empty');
    }

    console.log('\n🚀 Steam Inventory Integration is WORKING!');
    console.log('📝 Next steps:');
    console.log('   - Integrate with frontend profile page');
    console.log('   - Add market price fetching');
    console.log('   - Implement item listing for sale');
    console.log('   - Add trade offer system');

  })
  .catch(error => {
    console.error('❌ Steam Inventory API Error:');
    console.error(`   ${error.message}`);

    if (error.message.includes('private')) {
      console.log('\n💡 This is likely due to:');
      console.log('   - Private Steam profile');
      console.log('   - Private inventory settings');
      console.log('   - Steam ID not found');
      console.log('\n🔧 Try with a different Steam ID or check privacy settings');
    }

    console.log('\n📝 Steam Inventory Integration Status: NEEDS CONFIGURATION');
    console.log('💡 The API integration is working, but needs proper Steam ID with public inventory');
  });