// Test Dota 2 Inventory with Real User Data
const https = require('https');

const steamId = '76561199257487454'; // Real user Steam ID from our testing
const appId = '570'; // Dota 2 App ID
const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

console.log('🎮 TESTING DOTA 2 INVENTORY WITH REAL USER DATA');
console.log('================================================');
console.log(`Steam ID: ${steamId}`);
console.log(`App ID: ${appId} (Dota 2)`);
console.log(`API URL: ${apiUrl}`);
console.log('');

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

  console.log(`📡 Response Status: ${res.statusCode}`);
  console.log(`📦 Response Headers:`, {
    'content-type': res.headers['content-type'],
    'content-encoding': res.headers['content-encoding'],
    'content-length': res.headers['content-length']
  });

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
    console.log('');
    console.log(`📦 Response Length: ${data.length} bytes`);
    console.log('');

    if (data.length > 0) {
      console.log('📄 First 500 characters of response:');
      console.log('---');
      console.log(data.substring(0, 500));
      console.log('---');
      console.log('');
    }

    if (res.statusCode === 200) {
      if (data.trim() === 'null') {
        console.log('❌ Dota 2 inventory is private or empty');
        console.log('💡 This means the user has no Dota 2 items or the inventory is set to private');
      } else {
        try {
          const inventory = JSON.parse(data);
          console.log('✅ Successfully parsed Dota 2 inventory JSON');
          console.log('');

          console.log('📊 Dota 2 Inventory Analysis:');
          console.log('============================');

          if (inventory.success) {
            console.log(`✅ Inventory Success: ${inventory.success}`);
            console.log(`📦 Total Assets: ${inventory.assets ? inventory.assets.length : 0}`);
            console.log(`📝 Total Descriptions: ${inventory.descriptions ? inventory.descriptions.length : 0}`);

            if (inventory.assets && inventory.assets.length > 0) {
              console.log('');
              console.log('🎮 Dota 2 Items Found:');
              console.log('======================');

              // Show first few items
              const itemsToShow = Math.min(5, inventory.assets.length);
              for (let i = 0; i < itemsToShow; i++) {
                const asset = inventory.assets[i];
                const description = inventory.descriptions?.find(desc =>
                  desc.classid === asset.classid && desc.instanceid === asset.instanceid
                );

                console.log(``);
                console.log(`Item ${i + 1}:`);
                console.log(`  Asset ID: ${asset.assetid}`);
                console.log(`  Class ID: ${asset.classid}`);
                console.log(`  Instance ID: ${asset.instanceid}`);
                console.log(`  Amount: ${asset.amount}`);
                if (description) {
                  console.log(`  Name: ${description.name || 'Unknown'}`);
                  console.log(`  Type: ${description.type || 'Unknown'}`);
                  console.log(`  Market Name: ${description.market_name || 'Unknown'}`);
                  console.log(`  Tradable: ${description.tradable ? 'Yes' : 'No'}`);
                  console.log(`  Marketable: ${description.marketable ? 'Yes' : 'No'}`);
                }
              }

              if (inventory.assets.length > 5) {
                console.log(`... and ${inventory.assets.length - 5} more items`);
              }

              console.log('');
              console.log('🎯 SUCCESS: Dota 2 inventory loaded successfully!');
              console.log(`🎮 User has ${inventory.assets.length} Dota 2 items available`);

            } else {
              console.log('📭 No Dota 2 items found in inventory');
            }
          } else if (inventory.error) {
            console.log(`❌ Dota 2 Inventory Error: ${inventory.error}`);
          } else {
            console.log('❓ Unknown Dota 2 inventory response format');
          }
        } catch (parseError) {
          console.log(`❌ JSON Parse Error: ${parseError.message}`);
          console.log('');
          console.log('💡 This might indicate:');
          console.log('   - Steam API returned invalid JSON');
          console.log('   - Rate limiting or API restrictions');
          console.log('   - Network connectivity issues');
        }
      }
    } else {
      console.log(`❌ HTTP ${res.statusCode}: ${res.statusMessage}`);
      console.log('');
      console.log('💡 This might indicate:');
      console.log('   - Steam API server issues');
      console.log('   - Rate limiting (HTTP 429)');
      console.log('   - Invalid request (HTTP 400)');
      console.log('   - Authentication issues (HTTP 403)');
    }
  });

  stream.on('error', (error) => {
    console.log(`❌ Stream Error: ${error.message}`);
    console.log('');
    console.log('💡 This might indicate:');
    console.log('   - Network connectivity issues');
    console.log('   - Steam API server unavailability');
    console.log('   - DNS resolution problems');
  });

}).on('error', (error) => {
  console.log(`❌ Request Error: ${error.message}`);
  console.log('');
  console.log('💡 This might indicate:');
  console.log('   - Network connectivity issues');
  console.log('   - Invalid URL or Steam ID');
  console.log('   - Firewall or proxy blocking requests');
});

console.log('⏳ Waiting for Dota 2 API response...');
console.log('This may take a few seconds...');