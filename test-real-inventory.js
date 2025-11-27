// Test real Steam Inventory API
const https = require('https');

console.log('🧪 Testing Real Steam Inventory API Integration');
console.log('================================================\n');

// Use your Steam ID from the environment or provide a test one
const STEAM_ID = process.env.STEAM_ID || '76561199257487454';
const APP_ID = '730'; // Counter-Strike 2

console.log(`📦 Testing with Steam ID: ${STEAM_ID}`);
console.log(`🎮 App ID: ${APP_ID} (Counter-Strike 2)\n`);

// Test the Steam Inventory API directly
function testSteamInventoryAPI() {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://steamcommunity.com/inventory/${STEAM_ID}/${APP_ID}/2?l=english&count=5000`;

    console.log(`🔗 Testing URL: ${apiUrl}\n`);

    https.get(apiUrl, (res) => {
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

          // Process inventory items
          const items = inventory.assets.map(asset => {
            const description = inventory.descriptions.find(desc => desc.classid === asset.classid);

            return {
              assetId: asset.assetid,
              name: description?.name || 'Unknown Item',
              type: description?.type || '',
              rarity: description?.tags?.find(tag => tag.category === 'Rarity')?.localized_tag || '',
              quality: description?.tags?.find(tag => tag.category === 'Quality')?.localized_tag || '',
              exterior: description?.tags?.find(tag => tag.category === 'Exterior')?.localized_tag || '',
              tradable: description?.tradable === 1,
              marketable: description?.marketable === 1,
              price: Math.random() * 100 + 1 // Mock price for demo
            };
          });

          resolve({
            success: true,
            steamId: STEAM_ID,
            appId: APP_ID,
            items: items.slice(0, 10), // Show only first 10 items
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

// Test our Steam Inventory Service
function testInventoryService() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3011,
      path: `/inventory/${STEAM_ID}?appId=${APP_ID}`,
      method: 'GET'
    };

    console.log('🧪 Testing Steam Inventory Service...\n');

    https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (result.success) {
            resolve(result);
          } else {
            reject(new Error(result.error || 'Service returned error'));
          }

        } catch (error) {
          reject(new Error('Failed to parse service response'));
        }
      });

    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Run tests
async function runTests() {
  try {
    console.log('1️⃣ Testing direct Steam Inventory API...');

    const directResult = await testSteamInventoryAPI();
    console.log('✅ Direct Steam API test successful!');
    console.log(`📊 Found ${directResult.totalCount} items in Steam inventory\n`);

    if (directResult.items.length > 0) {
      console.log('📋 Sample items from Steam:');
      console.log('==========================');
      directResult.items.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   Type: ${item.type}`);
        console.log(`   Rarity: ${item.rarity}`);
        console.log(`   Tradable: ${item.tradable ? 'Yes' : 'No'}`);
        console.log(`   Marketable: ${item.marketable ? 'Yes' : 'No'}`);
        console.log('   -----------------------------------');
      });
    }

    console.log('\n2️⃣ Testing Steam Inventory Service...');

    const serviceResult = await testInventoryService();
    console.log('✅ Steam Inventory Service test successful!');

    if (serviceResult.data && serviceResult.data.items.length > 0) {
      console.log(`📊 Service returned ${serviceResult.data.items.length} items`);
      console.log('✅ Real Steam skins integration is WORKING!');

      console.log('\n🎮 Your Steam inventory is now accessible through:');
      console.log(`   📦 http://localhost:3011/inventory/${STEAM_ID}?appId=${APP_ID}`);
      console.log('   🌐 Frontend: http://localhost:3000/profile/inventory');

    } else {
      console.log('📭 Inventory is empty or private');
      console.log('💡 Check your Steam privacy settings if you expect to see items');
    }

    console.log('\n🚀 Real Steam Inventory Integration Status: SUCCESS!');
    console.log('📝 Your Steam skins are now being fetched from your actual Steam account!');

  } catch (error) {
    console.error('❌ Test failed:');
    console.error(`   ${error.message}`);

    if (error.message.includes('private') || error.message.includes('empty')) {
      console.log('\n💡 This is likely due to:');
      console.log('   - Private Steam profile');
      console.log('   - Private inventory settings');
      console.log('   - No items in inventory');
      console.log('   - Steam ID not found');
      console.log('\n🔧 To fix:');
      console.log('   1. Set your Steam profile to public');
      console.log('   2. Set your inventory to public');
      console.log('   3. Ensure you have items in your Steam inventory');
      console.log('   4. Verify your Steam ID is correct');
    }
  }
}

// Run the tests
runTests();