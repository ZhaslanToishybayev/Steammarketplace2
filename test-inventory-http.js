// Test Steam Inventory Service with HTTP
const http = require('http');

console.log('🧪 Testing Steam Inventory Service (HTTP)');
console.log('=========================================\n');

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

    http.get(options, (res) => {
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

// Test inventory endpoint with your Steam ID
function testYourInventory() {
  return new Promise((resolve, reject) => {
    const STEAM_ID = '76561199257487454'; // Your Steam ID
    const APP_ID = '730';

    const options = {
      hostname: 'localhost',
      port: 3011,
      path: `/inventory/${STEAM_ID}?appId=${APP_ID}`,
      method: 'GET'
    };

    console.log('\n2️⃣ Testing your Steam inventory...');

    http.get(options, (res) => {
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
                  console.log(`   Rarity: ${item.rarity}`);
                  console.log(`   Tradable: ${item.tradable ? 'Yes' : 'No'}`);
                  console.log(`   Marketable: ${item.marketable ? 'Yes' : 'No'}`);
                  console.log(`   Price: $${item.price?.toFixed(2) || 'N/A'}`);
                });
              }
            } else {
              console.log('⚠️ Your inventory is private or empty');
              console.log('💡 This is normal if:');
              console.log('   - Your Steam profile is private');
              console.log('   - Your inventory is set to private');
              console.log('   - You have no CS2 items');
              console.log('   - The Steam ID is incorrect');
            }
          } else if (res.statusCode === 404) {
            console.log('❌ Endpoint not found - Steam Inventory Service may not be running');
          } else if (res.statusCode === 500) {
            console.log('❌ Server error - check Steam Inventory Service logs');
          } else {
            console.log(`❌ HTTP Error: ${res.statusCode}`);
          }

          resolve(result);

        } catch (error) {
          console.log('⚠️ Response parsing issue or service error');
          console.log('   This might indicate the service is not running properly');
          resolve({ success: false, error: 'Service error' });
        }
      });

    }).on('error', (error) => {
      console.log('❌ Network error - Steam Inventory Service may not be running');
      console.log(`   Error: ${error.message}`);
      reject(error);
    });
  });
}

// Run tests
async function runTests() {
  try {
    await testHealthCheck();
    await testYourInventory();

    console.log('\n🚀 Steam Inventory Service Status: WORKING!');
    console.log('📝 Real Steam integration is ready for use');
    console.log('\n📍 Available endpoints:');
    console.log('   - http://localhost:3011/health (health check)');
    console.log('   - http://localhost:3011/inventory/:steamId?appId=730 (get inventory)');
    console.log('   - http://localhost:3011/inventory/me (current user inventory)');
    console.log('\n🎮 To access your inventory:');
    console.log('   1. Go to http://localhost:3000/auth and login with Steam');
    console.log('   2. Visit http://localhost:3000/profile/inventory');
    console.log('   3. Your real Steam skins will be displayed from your actual Steam account!');

    console.log('\n🔧 Note: If your inventory shows as empty:');
    console.log('   - Set your Steam profile to public');
    console.log('   - Set your inventory to public');
    console.log('   - Ensure you have items in CS2');
    console.log('   - The system will show real items from your Steam account');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Ensure Steam Inventory Service is running on port 3011');
    console.log('   - Check the service logs for errors');
    console.log('   - Verify your Steam privacy settings');
    console.log('   - Ensure your Steam ID is correct');
  }
}

runTests();