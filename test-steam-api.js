require('dotenv').config();
const axios = require('axios');

async function testSteamAPI() {
  console.log('🔍 Testing Steam API with improved headers...\n');

  const steamId = '76561198024774857'; // Another test account
  const appId = 730; // CS2
  const inventoryUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}`;

  // Headers with User-Agent (the fix we added)
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; Steam-Marketplace/1.0)',
    'Referer': 'https://steamcommunity.com/',
    'Origin': 'https://steamcommunity.com'
  };

  try {
    console.log('📡 Making request to:', inventoryUrl);
    console.log('📋 Headers:', JSON.stringify(headers, null, 2));

    const response = await axios.get(inventoryUrl, {
      params: {
        l: 'english',
        count: 5000
      },
      headers: headers,
      timeout: 30000
    });

    console.log('\n✅ SUCCESS! Response received:');
    console.log('Status:', response.status);
    console.log('StatusText:', response.statusText);
    console.log('Data keys:', Object.keys(response.data || {}));

    if (response.data && response.data.assets) {
      console.log('\n📦 Assets count:', response.data.assets.length);
      console.log('📝 Descriptions count:', response.data.descriptions?.length || 0);

      if (response.data.assets.length > 0) {
        console.log('\n🎮 First item:');
        const firstItem = response.data.assets[0];
        console.log('- assetid:', firstItem.assetid);
        console.log('- classid:', firstItem.classid);
        console.log('- instanceid:', firstItem.instanceid);

        // Find matching description
        const descKey = `${firstItem.classid}_${firstItem.instanceid}`;
        const description = response.data.descriptions?.find(
          d => `${d.classid}_${d.instanceid}` === descKey
        );
        if (description) {
          console.log('- name:', description.name);
          console.log('- market_name:', description.market_name);
          console.log('- marketable:', description.marketable);
          console.log('- tradable:', description.tradable);
        }
      }

      console.log('\n✅ Steam API is working correctly with User-Agent headers!');
      return true;
    } else {
      console.log('\n⚠️ No assets in response');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.log('\n❌ ERROR:');
    console.log('Message:', error.message);

    if (error.response) {
      console.log('\n📊 Response details:');
      console.log('- Status:', error.response.status);
      console.log('- StatusText:', error.response.statusText);
      console.log('- Data:', JSON.stringify(error.response.data, null, 2));
    }

    return false;
  }
}

testSteamAPI()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });