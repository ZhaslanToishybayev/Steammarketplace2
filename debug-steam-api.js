const https = require('https');

// Test the Steam Community API directly
function testSteamAPI() {
  const steamId = '76561198012345678';
  const appId = '730';
  const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

  console.log(`📦 Testing Steam API directly: ${apiUrl}`);

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

      if (res.statusCode === 200) {
        try {
          const inventory = JSON.parse(data);
          console.log(`📦 Parsed inventory:`, {
            success: inventory.success,
            assets: inventory.assets?.length || 0,
            descriptions: inventory.descriptions?.length || 0,
            error: inventory.error
          });
        } catch (parseError) {
          console.error('❌ Failed to parse JSON:', parseError.message);
          console.log('📦 Raw data (first 500 chars):', data.substring(0, 500));
        }
      } else {
        console.log(`❌ HTTP ${res.statusCode}: ${res.statusMessage}`);
      }
    });

    stream.on('error', (error) => {
      console.error('❌ Stream error:', error);
    });

  }).on('error', (error) => {
    console.error('❌ HTTPS request error:', error);
  });
}

testSteamAPI();