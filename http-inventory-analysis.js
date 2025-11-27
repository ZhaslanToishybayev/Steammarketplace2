// COMPREHENSIVE HTTP INVENTORY ANALYSIS
// ====================================
// Direct HTTP analysis of Steam inventory data for user's Steam ID

const https = require('https');
const axios = require('axios');

// User's Steam ID from previous analysis
const STEAM_ID = '76561199257487454';

console.log('🔍 COMPREHENSIVE HTTP INVENTORY ANALYSIS');
console.log('==========================================');
console.log(`🎯 Analyzing Steam inventory for ID: ${STEAM_ID}`);
console.log('');

// Test Steam Web API (profile info)
async function testSteamWebAPI() {
  console.log('🌐 Testing Steam Web API (Profile Information)');
  console.log('------------------------------------------------');

  try {
    const apiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=YOUR_STEAM_API_KEY_HERE&steamids=${STEAM_ID}`;

    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      timeout: 10000
    });

    console.log('✅ Steam Web API Response Status:', response.status);
    console.log('📊 Profile Data:', {
      steamid: response.data.response.players[0]?.steamid,
      personaname: response.data.response.players[0]?.personaname,
      profilestate: response.data.response.players[0]?.profilestate,
      commentpermission: response.data.response.players[0]?.commentpermission,
      privacyState: response.data.response.players[0]?.communityvisibilitystate === 3 ? 'Public' : 'Private'
    });

    return response.data.response.players[0];
  } catch (error) {
    console.error('❌ Steam Web API Error:', error.message);
    return null;
  }
}

// Test Steam Community Inventory API for multiple games
async function testSteamCommunityAPI() {
  console.log('');
  console.log('📦 Testing Steam Community Inventory API');
  console.log('------------------------------------------');

  const games = [
    { appId: '570', name: 'Dota 2', contextId: '2' },
    { appId: '730', name: 'Counter-Strike 2', contextId: '2' },
    { appId: '440', name: 'Team Fortress 2', contextId: '2' },
    { appId: '578080', name: 'PUBG', contextId: '2' },
    { appId: '271590', name: 'GTA V', contextId: '2' }
  ];

  const results = [];

  for (const game of games) {
    console.log(`\n🎮 Testing ${game.name} (AppID: ${game.appId})`);
    console.log(`🔗 URL: https://steamcommunity.com/inventory/${STEAM_ID}/${game.appId}/${game.contextId}`);

    try {
      const apiUrl = `https://steamcommunity.com/inventory/${STEAM_ID}/${game.appId}/${game.contextId}?l=english&count=5000`;

      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        timeout: 15000,
        validateStatus: () => true // Don't throw on HTTP errors
      });

      console.log(`📋 Status: ${response.status} ${response.statusText}`);
      console.log(`📄 Response length: ${response.data ? response.data.length : 0} chars`);

      let result = {
        game: game.name,
        appId: game.appId,
        status: response.status,
        statusText: response.statusText,
        data: null,
        itemCount: 0,
        error: null
      };

      if (response.status === 200) {
        try {
          const inventory = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

          if (inventory.success && inventory.assets && inventory.assets.length > 0) {
            result.itemCount = inventory.assets.length;
            result.data = {
              assets: inventory.assets.length,
              descriptions: inventory.descriptions ? inventory.descriptions.length : 0,
              success: inventory.success
            };

            console.log(`✅ SUCCESS: Found ${inventory.assets.length} items`);
            console.log(`📦 Sample items:`, inventory.assets.slice(0, 2).map(asset => ({
              assetid: asset.assetid,
              classid: asset.classid
            })));

          } else if (inventory.success && (!inventory.assets || inventory.assets.length === 0)) {
            console.log('📭 EMPTY: No items found in inventory');
            result.itemCount = 0;
          } else if (response.data === 'null' || response.data === null) {
            console.log('🔒 PRIVATE: Inventory is private or not accessible');
            result.error = 'Inventory is private';
          } else {
            console.log('⚠️ UNKNOWN: Unexpected response format');
            result.error = 'Unknown response format';
          }
        } catch (parseError) {
          console.log('❌ PARSE ERROR:', parseError.message);
          result.error = `Parse error: ${parseError.message}`;
        }
      } else {
        console.log(`❌ HTTP ERROR: ${response.status} ${response.statusText}`);
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }

      results.push(result);
      console.log(`⏳ Waiting 2 seconds before next request...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error('❌ REQUEST ERROR:', error.message);
      results.push({
        game: game.name,
        appId: game.appId,
        status: 'error',
        error: error.message
      });
    }
  }

  return results;
}

// Test HTML scraping as fallback
async function testHTMLScraping() {
  console.log('');
  console.log('🌐 Testing HTML Scraping Fallback');
  console.log('----------------------------------');

  const games = [
    { appId: '570', name: 'Dota 2' },
    { appId: '730', name: 'Counter-Strike 2' }
  ];

  for (const game of games) {
    console.log(`\n🔍 Scraping HTML for ${game.name}`);
    console.log(`🔗 URL: https://steamcommunity.com/profiles/${STEAM_ID}/inventory/#${STEAM_ID}_${game.appId}_2`);

    try {
      const inventoryUrl = `https://steamcommunity.com/profiles/${STEAM_ID}/inventory/#${STEAM_ID}_${game.appId}_2`;

      const response = await axios.get(inventoryUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        },
        timeout: 15000,
        validateStatus: () => true
      });

      console.log(`📋 HTML Status: ${response.status} ${response.statusText}`);
      console.log(`📄 HTML length: ${response.data.length} chars`);

      // Check for inventory indicators
      const htmlContent = response.data;
      const hasPrivateIndicator = htmlContent.includes('private') || htmlContent.includes('Private');
      const hasEmptyIndicator = htmlContent.includes('This user has no items');
      const hasInventoryContent = htmlContent.includes('inventory_ctn') || htmlContent.includes('itemHolder');

      console.log('🔍 Analysis:');
      console.log(`  Private indicator: ${hasPrivateIndicator}`);
      console.log(`  Empty indicator: ${hasEmptyIndicator}`);
      console.log(`  Has inventory content: ${hasInventoryContent}`);

      if (hasPrivateIndicator) {
        console.log('🔒 CONCLUSION: Inventory appears to be private');
      } else if (hasEmptyIndicator) {
        console.log('📭 CONCLUSION: No items found in inventory');
      } else if (hasInventoryContent) {
        console.log('✅ CONCLUSION: Inventory appears to be public');
      } else {
        console.log('❓ CONCLUSION: Unable to determine inventory status');
      }

      // Look for g_rgInventory data
      const inventoryMatch = htmlContent.match(/g_rgInventory\s*=\s*(\{.*?\});/);
      if (inventoryMatch) {
        console.log('✅ Found g_rgInventory data in HTML');
        try {
          const inventoryData = JSON.parse(inventoryMatch[1]);
          const itemCount = inventoryData.assets ? inventoryData.assets.length : 0;
          console.log(`📊 Assets found: ${itemCount}`);
          if (itemCount > 0) {
            console.log('📦 Sample assets:', inventoryData.assets.slice(0, 2));
          }
        } catch (parseError) {
          console.log('❌ Failed to parse g_rgInventory:', parseError.message);
        }
      } else {
        console.log('❌ No g_rgInventory data found');
      }

    } catch (error) {
      console.error('❌ HTML Scraping Error:', error.message);
    }
  }
}

// Main analysis function
async function runAnalysis() {
  console.log('🚀 Starting comprehensive Steam inventory analysis...\n');

  try {
    // Test Steam Web API
    const profileData = await testSteamWebAPI();

    // Test Steam Community API
    const communityResults = await testSteamCommunityAPI();

    // Test HTML scraping
    await testHTMLScraping();

    // Summary
    console.log('');
    console.log('📋 ANALYSIS SUMMARY');
    console.log('===================');

    if (profileData) {
      console.log(`👤 User: ${profileData.personaname}`);
      console.log(`🔒 Profile Privacy: ${profileData.communityvisibilitystate === 3 ? 'Public' : 'Private'}`);
    }

    console.log('\n🎮 Game Inventory Results:');
    communityResults.forEach(result => {
      const status = result.error ? '❌' : result.itemCount > 0 ? '✅' : '📭';
      console.log(`  ${status} ${result.game}: ${result.itemCount || 0} items ${result.error ? `(${result.error})` : ''}`);
    });

    const totalItems = communityResults.reduce((sum, result) => sum + (result.itemCount || 0), 0);
    console.log(`\n🎯 TOTAL ITEMS FOUND: ${totalItems}`);

    if (totalItems === 0) {
      console.log('💡 This means you currently have no tradable items in your Steam inventory across the tested games.');
      console.log('🔧 To see items, you would need to:');
      console.log('   1. Own items in your Steam inventory');
      console.log('   2. Set your inventory to public visibility');
      console.log('   3. Have items in games that support trading (CS2, Dota 2, etc.)');
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

// Run the analysis
runAnalysis().catch(console.error);