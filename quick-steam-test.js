// Quick Test: Check Steam API Response Status
const https = require('https');

console.log('🔍 Quick Steam API Status Check');
console.log('=================================');

const steamId = '76561199257487454';
const appId = '730';
const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
};

https.get(apiUrl, options, (res) => {
  console.log('📡 Steam API Response:');
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', {
    'content-type': res.headers['content-type'],
    'content-encoding': res.headers['content-encoding'],
    'content-length': res.headers['content-length'],
    'server': res.headers['server']
  });

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response length:', data.length);
    console.log('First 200 chars:', data.substring(0, 200));

    // Check what our current code would do
    if (res.statusCode !== 200) {
      console.log('\n❌ Our code would reject with:');
      if (res.statusCode === 400) {
        console.log('Error: Invalid Steam ID or inventory not accessible');
      } else if (res.statusCode === 403 || res.statusCode === 401) {
        console.log('Error: Inventory is private or not accessible');
      } else if (res.statusCode === 404) {
        console.log('Error: User not found or inventory does not exist');
      } else {
        console.log(`Error: HTTP ${res.statusCode}: ${res.statusMessage}`);
      }
    } else {
      console.log('\n✅ Status 200 - would proceed to parse JSON');
      try {
        const parsed = JSON.parse(data);
        console.log('✅ JSON parsed successfully');
        console.log('Success field:', parsed.success);
        console.log('Assets count:', parsed.assets?.length || 0);
        console.log('Error field:', parsed.error);
      } catch (e) {
        console.log('❌ JSON parsing failed:', e.message);
      }
    }
  });

}).on('error', (error) => {
  console.log('❌ Request error:', error.message);
});