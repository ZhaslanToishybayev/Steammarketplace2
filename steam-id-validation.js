// Steam ID and Profile Validation Test
const https = require('https');

console.log('🔍 STEAM ID AND PROFILE VALIDATION TEST');
console.log('=========================================');

// Test Steam ID validation
function validateSteamId(steamId) {
  console.log(`🧪 Validating Steam ID: ${steamId}`);

  // Check format
  if (!steamId || steamId.length < 17) {
    console.log('❌ Steam ID too short');
    return false;
  }

  if (!/^\d+$/.test(steamId)) {
    console.log('❌ Steam ID contains non-numeric characters');
    return false;
  }

  console.log('✅ Steam ID format is valid');
  return true;
}

// Test Steam profile info
async function testSteamProfile(steamId) {
  console.log(`\n🔍 Testing Steam profile for ${steamId}...`);

  const apiUrl = `https://steamcommunity.com/profiles/${steamId}?xml=1`;

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/xml,text/html,*/*',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive'
    },
    timeout: 10000
  };

  return new Promise((resolve, reject) => {
    https.get(apiUrl, options, (res) => {
      let data = '';
      let stream = res;

      // Handle gzip compression
      const contentEncoding = res.headers['content-encoding'];
      if (contentEncoding && contentEncoding.includes('gzip')) {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
      }

      stream.on('data', (chunk) => {
        data += chunk;
      });

      stream.on('end', () => {
        console.log(`📡 Response Status: ${res.statusCode}`);
        console.log(`📦 Response Length: ${data.length} bytes`);

        if (res.statusCode === 200) {
          // Parse XML response
          const hasError = data.includes('<error>') || data.includes('The specified profile could not be found');
          const isPrivate = data.includes('<privacyState>private</privacyState>') ||
                           data.includes('This profile is private') ||
                           data.includes('privateprofile');

          if (hasError) {
            console.log('❌ Profile not found or invalid');
            resolve({ valid: false, error: 'Profile not found' });
          } else if (isPrivate) {
            console.log('🔒 Profile is set to private');
            resolve({ valid: true, private: true, data });
          } else {
            console.log('✅ Profile is public and accessible');
            // Extract profile info
            const nameMatch = data.match(/<steamID>(.*?)<\/steamID>/);
            const vanityMatch = data.match(/<vanityURL>(.*?)<\/vanityURL>/);
            const stateMatch = data.match(/<onlineState>(.*?)<\/onlineState>/);

            const profileInfo = {
              valid: true,
              private: false,
              steamName: nameMatch ? nameMatch[1] : 'Unknown',
              vanityURL: vanityMatch ? vanityMatch[1] : null,
              onlineState: stateMatch ? stateMatch[1] : 'Unknown'
            };

            console.log(`👤 Steam Name: ${profileInfo.steamName}`);
            console.log(`🌐 Vanity URL: ${profileInfo.vanityURL || 'None'}`);
            console.log(`📍 Online State: ${profileInfo.onlineState}`);

            resolve(profileInfo);
          }
        } else {
          console.log(`❌ HTTP ${res.statusCode}: ${res.statusMessage}`);
          resolve({ valid: false, error: `HTTP ${res.statusCode}` });
        }
      });

    }).on('error', (error) => {
      console.log(`❌ Request error: ${error.message}`);
      reject(error);
    });
  });
}

// Test specific game inventory directly
async function testDirectGameInventory(steamId, appId) {
  console.log(`\n🎮 Testing direct inventory access for AppID ${appId}...`);

  const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5`;

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    },
    timeout: 15000
  };

  return new Promise((resolve, reject) => {
    https.get(apiUrl, options, (res) => {
      let data = '';
      let stream = res;

      // Handle gzip compression
      const contentEncoding = res.headers['content-encoding'];
      if (contentEncoding && contentEncoding.includes('gzip')) {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
      }

      stream.on('data', (chunk) => {
        data += chunk;
      });

      stream.on('end', () => {
        console.log(`📡 Response Status: ${res.statusCode}`);
        console.log(`📦 Response Length: ${data.length} bytes`);

        if (data.length > 0) {
          console.log(`📄 First 200 chars: ${data.substring(0, 200)}...`);
        }

        if (res.statusCode === 200) {
          if (data.trim() === 'null') {
            console.log('🔒 Inventory is private or empty');
            resolve({ success: false, reason: 'private_or_empty' });
          } else {
            try {
              const inventory = JSON.parse(data);
              if (inventory.success && inventory.assets && inventory.assets.length > 0) {
                console.log(`✅ Found ${inventory.assets.length} items`);
                resolve({ success: true, items: inventory.assets.length });
              } else {
                console.log('📭 Inventory is empty');
                resolve({ success: false, reason: 'empty' });
              }
            } catch (parseError) {
              console.log(`❌ JSON parse error: ${parseError.message}`);
              resolve({ success: false, reason: 'parse_error', raw: data });
            }
          }
        } else if (res.statusCode === 400) {
          console.log('❌ Bad Request - Invalid Steam ID or AppID');
          resolve({ success: false, reason: 'bad_request' });
        } else if (res.statusCode === 403) {
          console.log('🚫 Forbidden - Profile is private');
          resolve({ success: false, reason: 'forbidden' });
        } else if (res.statusCode === 429) {
          console.log('⏳ Rate limited by Steam');
          resolve({ success: false, reason: 'rate_limited' });
        } else {
          console.log(`❌ Unexpected status: ${res.statusCode}`);
          resolve({ success: false, reason: `status_${res.statusCode}` });
        }
      });

    }).on('error', (error) => {
      console.log(`❌ Request error: ${error.message}`);
      reject(error);
    });
  });
}

// Main test function
async function runValidationTest() {
  const steamId = '76561199257487454';

  console.log('🎯 STEAM INTEGRATION DEEP ANALYSIS');
  console.log('==================================');

  // Step 1: Validate Steam ID format
  const isValidSteamId = validateSteamId(steamId);
  if (!isValidSteamId) {
    console.log('\n❌ Steam ID validation failed');
    return;
  }

  // Step 2: Test Steam profile accessibility
  let profileResult;
  try {
    profileResult = await testSteamProfile(steamId);
  } catch (error) {
    console.log(`❌ Profile test failed: ${error.message}`);
    profileResult = { valid: false, error: error.message };
  }

  // Step 3: Test direct inventory access
  if (profileResult.valid) {
    console.log('\n🎮 TESTING DIRECT INVENTORY ACCESS');
    console.log('==================================');

    const games = [
      { appId: '730', name: 'Counter-Strike 2' },
      { appId: '570', name: 'Dota 2' },
      { appId: '440', name: 'Team Fortress 2' }
    ];

    for (const game of games) {
      try {
        const result = await testDirectGameInventory(steamId, game.appId);
        console.log(`${result.success ? '✅' : '❌'} ${game.name}: ${result.success ? `Found ${result.items} items` : result.reason}`);
      } catch (error) {
        console.log(`❌ ${game.name}: Request failed - ${error.message}`);
      }

      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Step 4: Final analysis
  console.log('\n🎯 FINAL ANALYSIS');
  console.log('=================');

  if (!profileResult.valid) {
    console.log('🔴 Steam profile is not accessible');
    console.log('   - Steam ID might be invalid');
    console.log('   - Profile might not exist');
    console.log('   - Steam Community might be down');
  } else if (profileResult.private) {
    console.log('🟡 Steam profile is set to private');
    console.log('   - Change privacy settings to "Public"');
    console.log('   - Both profile and inventory need to be public');
  } else {
    console.log('🟢 Steam profile is accessible and public');
    console.log('   - If inventory is still not accessible, check inventory privacy settings');
    console.log('   - Verify you have items in the tested games');
  }

  console.log('\n🔧 TROUBLESHOOTING STEPS:');
  console.log('1. Verify Steam ID is correct');
  console.log('2. Set profile privacy to "Public"');
  console.log('3. Set inventory privacy to "Public"');
  console.log('4. Ensure you have items in the games you\'re testing');
  console.log('5. Wait 5-10 minutes after changing privacy settings');
  console.log('6. Try testing with a different Steam ID to isolate the issue');

  return { steamId, profile: profileResult };
}

// Run the test
runValidationTest()
  .then(result => {
    console.log('\n🏁 VALIDATION COMPLETE');
    console.log(`Steam ID: ${result.steamId}`);
    console.log(`Profile Valid: ${result.profile.valid}`);
    if (result.profile.private) {
      console.log('⚠️  Profile is set to private - this is the issue!');
    }
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
  });