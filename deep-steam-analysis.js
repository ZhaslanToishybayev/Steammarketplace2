// Deep Analysis of Steam Inventory API Response
const https = require('https');
const zlib = require('zlib');

console.log('🔍 DEEP ANALYSIS: Steam Inventory API Response');
console.log('================================================');

const steamId = '76561199257487454';
const appId = '730';
const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

console.log(`🧪 Testing Steam ID: ${steamId}`);
console.log(`🎮 App ID: ${appId} (CS2)`);
console.log(`📦 API URL: ${apiUrl}`);
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
  let rawData = [];
  let totalLength = 0;

  console.log('📡 Response Headers:');
  console.log('Status Code:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  console.log('Content-Encoding:', res.headers['content-encoding']);
  console.log('Content-Length:', res.headers['content-length']);
  console.log('');

  // Handle compression
  let stream = res;
  const contentEncoding = res.headers['content-encoding'];

  if (contentEncoding && contentEncoding.includes('gzip')) {
    console.log('📦 Stream is gzipped, decompressing...');
    stream = res.pipe(zlib.createGunzip());
  } else if (contentEncoding && contentEncoding.includes('deflate')) {
    console.log('📦 Stream is deflated, decompressing...');
    stream = res.pipe(zlib.createInflate());
  }

  stream.on('data', (chunk) => {
    rawData.push(chunk);
    totalLength += chunk.length;
  });

  stream.on('end', () => {
    const data = Buffer.concat(rawData).toString('utf8');
    console.log(`📦 Response Length: ${totalLength} bytes`);
    console.log(`📦 Response Status: ${res.statusCode}`);
    console.log('');

    if (res.statusCode !== 200) {
      console.log('❌ HTTP Error Response:');
      console.log('Status:', res.statusCode);
      console.log('Raw Data:', data);
      console.log('');
      return;
    }

    console.log('📦 Raw Response Data:');
    console.log('First 1000 chars:');
    console.log(data.substring(0, 1000));
    console.log('');
    console.log('Last 500 chars:');
    console.log(data.substring(data.length - 500));
    console.log('');

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(data);
      console.log('✅ JSON Parsing Successful:');
      console.log('Parsed Object:', JSON.stringify(parsed, null, 2));
    } catch (parseError) {
      console.log('❌ JSON Parsing Failed:');
      console.log('Error:', parseError.message);
      console.log('Data starts with:', data.substring(0, 50));
      console.log('Data ends with:', data.substring(data.length - 50));

      // Check for common error patterns
      if (data.trim() === 'null') {
        console.log('🔍 Pattern: Data is "null"');
      } else if (data.includes('<html>')) {
        console.log('🔍 Pattern: HTML response (Steam error page)');
      } else if (data.includes('error')) {
        console.log('🔍 Pattern: Contains "error"');
      } else if (data.length === 0) {
        console.log('🔍 Pattern: Empty response');
      } else {
        console.log('🔍 Pattern: Unknown format');
      }
    }
  });

  stream.on('error', (error) => {
    console.log('❌ Stream Error:', error.message);
  });

}).on('error', (error) => {
  console.log('❌ HTTPS Request Error:', error.message);
});

// Test with different User-Agents to see if it's blocking
setTimeout(() => {
  console.log('\n🔍 Testing with different User-Agent...');
  const options2 = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*'
    }
  };

  https.get(apiUrl, options2, (res) => {
    console.log('📡 Alternative User-Agent Response:', res.statusCode);
  }).on('error', (error) => {
    console.log('❌ Alternative Request Error:', error.message);
  });
}, 2000);