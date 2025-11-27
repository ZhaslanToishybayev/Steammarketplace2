// Test Steam Inventory for Current User
const https = require('https');

console.log('🔍 Testing Steam Inventory for Current User');
console.log('============================================');

// Current user Steam ID from the system
const steamId = '76561199257487454';
const appId = '730'; // CS2

console.log(`🧪 Testing Steam ID: ${steamId}`);
console.log(`🎮 App ID: ${appId} (Counter-Strike 2)`);

const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

console.log(`📦 Calling Steam API: ${apiUrl}`);

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive'
  }
};

https.get(apiUrl, options, (res) => {
  let data = '';
  let stream = res;

  // Handle gzip compression
  const contentEncoding = res.headers['content-encoding'];
  if (contentEncoding && contentEncoding.includes('gzip')) {
    const zlib = require('zlib');
    stream = res.pipe(zlib.createGunzip());
    console.log('📦 Stream is gzipped, decompressing...');
  }

  stream.on('data', (chunk) => {
    data += chunk;
  });

  stream.on('end', () => {
    console.log(`📦 Steam API Response Status: ${res.statusCode}`);
    console.log(`📦 Response length: ${data.length} bytes`);

    // Check for common error responses
    if (res.statusCode !== 200) {
      if (res.statusCode === 400) {
        console.log('❌ Error: Invalid Steam ID or inventory not accessible');
        console.log('💡 Possible reasons:');
        console.log('   - Steam profile is private');
        console.log('   - Inventory is private');
        console.log('   - No items in inventory for this game');
        console.log('   - Steam Community API temporarily unavailable');
      } else if (res.statusCode === 403 || res.statusCode === 401) {
        console.log('❌ Error: Inventory is private or not accessible');
      } else if (res.statusCode === 404) {
        console.log('❌ Error: User not found or inventory does not exist');
      } else {
        console.log(`❌ Error: HTTP ${res.statusCode}: ${res.statusMessage}`);
      }
      return;
    }

    // Handle case where Steam API returns null (private/empty inventory)
    if (data.trim() === 'null') {
      console.log('❌ Steam API returned null response');
      console.log('💡 This usually means:');
      console.log('   - Steam profile/inventory is set to private');
      console.log('   - User has no items in their inventory for this game');
      console.log('   - Steam Community API is experiencing issues');
      return;
    }

    try {
      const inventory = JSON.parse(data);
      console.log('📦 Parsed inventory object:', {
        success: inventory.success,
        assets: inventory.assets?.length || 0,
        descriptions: inventory.descriptions?.length || 0,
        error: inventory.error
      });

      if (inventory.error) {
        console.log(`❌ Steam API Error: ${inventory.error}`);
        return;
      }

      if (!inventory.success || !inventory.assets) {
        console.log('❌ Inventory is empty or private');
        return;
      }

      console.log(`✅ Successfully retrieved ${inventory.assets.length} items!`);

      // Show first few items
      const items = inventory.assets.slice(0, 3).map(asset => {
        const description = inventory.descriptions.find(desc => desc.classid === asset.classid);
        return {
          name: description?.name || 'Unknown Item',
          tradable: description?.tradable,
          marketable: description?.marketable,
          type: description?.type
        };
      });

      console.log('📋 First 3 items:', items);

    } catch (parseError) {
      console.log('❌ Failed to parse Steam inventory JSON:', parseError.message);
      console.log('📦 Raw response data (first 500 chars):', data.substring(0, 500));
    }
  });

}).on('error', (error) => {
  console.log('❌ Steam API request error:', error.message);
});

console.log('\n💡 Troubleshooting Steps for Users:');
console.log('====================================');
console.log('1. Check Steam Profile Privacy:');
console.log('   - Go to: https://steamcommunity.com/my/edit/settings/');
console.log('   - Set "Inventory Privacy" to "Public"');
console.log('   - Set "Profile Privacy" to "Public"');
console.log('');
console.log('2. Verify Game Items:');
console.log('   - Make sure you have items in your CS2 inventory');
console.log('   - Check: https://steamcommunity.com/my/inventory');
console.log('');
console.log('3. Try Different Games:');
console.log('   - Some users have items in Dota 2 but not CS2');
console.log('   - Try: http://localhost:3000/inventory?appId=570 (Dota 2)');
console.log('');
console.log('4. Wait and Retry:');
console.log('   - Steam Community API can be temporarily unavailable');
console.log('   - Try again in a few minutes');