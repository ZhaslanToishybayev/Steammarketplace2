const express = require('express');
const https = require('https');
const app = express();

// Test the getSteamInventory function directly
function getSteamInventory(steamId, appId = 730) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

    console.log(`📦 Testing Steam API: ${apiUrl}`);

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

      console.log(`📦 Response status: ${res.statusCode}`);
      console.log(`📦 Response headers:`, res.headers);

      // Handle gzip compression
      const contentEncoding = res.headers['content-encoding'];
      let stream = res;

      if (contentEncoding && contentEncoding.includes('gzip')) {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
        console.log('📦 Stream is gzipped, decompressing...');
      } else if (contentEncoding && contentEncoding.includes('deflate')) {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createInflate());
        console.log('📦 Stream is deflated, decompressing...');
      }

      stream.on('data', (chunk) => {
        data += chunk;
      });

      stream.on('end', () => {
        console.log(`📦 Response length: ${data.length} bytes`);
        console.log(`📦 Raw response:`, data);

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        try {
          const inventory = JSON.parse(data);
          console.log(`📦 Parsed inventory:`, {
            success: inventory.success,
            assets: inventory.assets?.length || 0,
            descriptions: inventory.descriptions?.length || 0
          });

          if (!inventory.success || !inventory.assets) {
            reject(new Error('Inventory is empty or private'));
            return;
          }

          const items = inventory.assets.map(asset => {
            const description = inventory.descriptions.find(desc => desc.classid === asset.classid);
            return {
              assetId: asset.assetid,
              name: description?.name || 'Unknown Item',
              type: description?.type || '',
              rarity: description?.tags?.find(tag => tag.category === 'Rarity')?.localized_tag || '',
              amount: asset.amount
            };
          });

          resolve({
            success: true,
            steamId,
            appId,
            items,
            totalCount: items.length
          });
        } catch (parseError) {
          console.error('❌ Failed to parse JSON:', parseError.message);
          console.log('📦 Raw data (first 500 chars):', data.substring(0, 500));
          reject(new Error('Failed to parse Steam inventory response'));
        }
      });

      stream.on('error', (error) => {
        console.error('❌ Stream error:', error);
        reject(error);
      });

    }).on('error', (error) => {
      console.error('❌ HTTPS request error:', error);
      reject(error);
    });
  });
}

// Test the function
async function testInventory() {
  try {
    console.log('🧪 Testing Steam inventory function...');
    const result = await getSteamInventory('76561198012345678', '730');
    console.log('✅ Success:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testInventory();