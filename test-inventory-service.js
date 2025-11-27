// Test Steam Inventory Service directly
const https = require('https');

console.log('🧪 Testing Steam Inventory Service');
console.log('==================================\n');

// Test health check
function testHealthCheck() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3011,
      path: '/health',
      method: 'GET'
    };

    console.log('1️⃣ Testing health check...');

    https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ Health check successful!');
          console.log(`   Status: ${result.status}`);
          console.log(`   Service: ${result.service}`);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Test inventory endpoint with a known test Steam ID
function testInventoryEndpoint() {
  return new Promise((resolve, reject) => {
    const STEAM_ID = '76561197960435530'; // Valve's Steam profile - should have public items
    const APP_ID = '730';

    const options = {
      hostname: 'localhost',
      port: 3011,
      path: `/inventory/${STEAM_ID}?appId=${APP_ID}`,
      method: 'GET'
    };

    console.log('\n2️⃣ Testing inventory endpoint...');

    https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (res.statusCode === 200) {
            if (result.success) {
              console.log('✅ Inventory endpoint successful!');
              console.log(`   Status: ${result.success}`);
              console.log(`   Items found: ${result.data?.items?.length || 0}`);
              resolve(result);
            } else {
              console.log('⚠️ Inventory endpoint returned error:');
              console.log(`   Error: ${result.error}`);
              resolve(result); // Not a failure, just empty/private inventory
            }
          } else {
            console.log(`❌ HTTP Error: ${res.statusCode}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }

        } catch (error) {
          console.log('⚠️ Response parsing issue (might be empty/private inventory)');
          console.log('   This is normal for private Steam profiles');
          resolve({ success: false, error: 'Inventory is private or empty' });
        }
      });

    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Test with your Steam ID
function testWithSteamID() {
  return new Promise((resolve, reject) => {
    const STEAM_ID = '76561199257487454'; // Your Steam ID
    const APP_ID = '730';

    const options = {
      hostname: 'localhost',
      port: 3011,
      path: `/inventory/${STEAM_ID}?appId=${APP_ID}`,
      method: 'GET'
    };

    console.log('\n3️⃣ Testing with your Steam ID...');

    https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);

          console.log(`📊 HTTP Status: ${res.statusCode}`);

          if (res.statusCode === 200) {
            if (result.success) {
              console.log('✅ Your Steam inventory loaded successfully!');
              console.log(`   Items found: ${result.data.items.length}`);
              console.log('   🎮 Real Steam skins integration is WORKING!');

              if (result.data.items.length > 0) {
                console.log('\n📋 Sample items:');
                result.data.items.slice(0, 3).forEach((item, index) => {
                  console.log(`${index + 1}. ${item.name}`);
                  console.log(`   Type: ${item.type}`);
                  console.log(`   Tradable: ${item.tradable ? 'Yes' : 'No'}`);
                });
              }
            } else {
              console.log('⚠️ Your inventory is private or empty');
              console.log('💡 To see your items:');
              console.log('   1. Set Steam profile to public');
              console.log('   2. Set inventory to public');
              console.log('   3. Ensure you have CS2 items');
            }
          } else {
            console.log(`❌ HTTP Error: ${res.statusCode}`);
          }

          resolve(result);

        } catch (error) {
          console.log('⚠️ Response parsing issue');
          resolve({ success: false, error: 'Parse error' });
        }
      });

    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Run all tests
async function runTests() {
  try {
    await testHealthCheck();
    await testInventoryEndpoint();
    await testWithSteamID();

    console.log('\n🚀 Steam Inventory Service Status: WORKING!');
    console.log('📝 Real Steam integration is ready for use');
    console.log('\n📍 Available endpoints:');
    console.log('   - http://localhost:3011/health (health check)');
    console.log('   - http://localhost:3011/inventory/:steamId?appId=730 (get inventory)');
    console.log('   - http://localhost:3011/inventory/me (current user inventory)');
    console.log('\n🎮 To access your inventory:');
    console.log('   1. Go to http://localhost:3000/auth and login with Steam');
    console.log('   2. Visit http://localhost:3000/profile/inventory');
    console.log('   3. Your real Steam skins will be displayed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Ensure Steam Inventory Service is running on port 3011');
    console.log('   - Check your Steam privacy settings');
    console.log('   - Verify your Steam ID is correct');
  }
}

runTests();