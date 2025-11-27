// Test Steam Inventory for Multiple Games
const https = require('https');

console.log('🔍 Testing Steam Inventory for Multiple Games');
console.log('================================================');

// Current user Steam ID from the system
const steamId = '76561199257487454';

// Popular game App IDs to test
const games = [
  { appId: '730', name: 'Counter-Strike 2', short: 'CS2' },
  { appId: '570', name: 'Dota 2', short: 'Dota 2' },
  { appId: '440', name: 'Team Fortress 2', short: 'TF2' },
  { appId: '578080', name: 'PUBG: Battlegrounds', short: 'PUBG' },
  { appId: '271590', name: 'Grand Theft Auto V', short: 'GTA V' },
  { appId: '359550', name: 'Rocket League', short: 'Rocket League' },
  { appId: '252490', name: 'Rust', short: 'Rust' },
  { appId: '304930', name: 'Warframe', short: 'Warframe' },
  { appId: '753290', name: 'Dead by Daylight', short: 'DBD' },
  { appId: '236390', name: 'ARK: Survival Evolved', short: 'ARK' },
  { appId: '4000', name: 'Garry\'s Mod', short: 'GMod' },
  { appId: '346110', name: 'Fallout 4', short: 'Fallout 4' },
  { appId: '221100', name: 'DayZ', short: 'DayZ' },
  { appId: '816420', name: 'Lost Ark', short: 'Lost Ark' },
  { appId: '1172470', name: 'Counter-Strike: Global Offensive', short: 'CS:GO' }
];

console.log(`🧪 Testing Steam ID: ${steamId}`);
console.log(`🎮 Testing ${games.length} popular games...`);
console.log('');

// Function to test a single game
function testGame(game) {
  return new Promise((resolve) => {
    const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${game.appId}/2?l=english&count=5000`;

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
      }

      stream.on('data', (chunk) => {
        data += chunk;
      });

      stream.on('end', () => {
        let result = {
          game: game.name,
          appId: game.appId,
          short: game.short,
          statusCode: res.statusCode,
          responseLength: data.length,
          hasItems: false,
          itemCount: 0,
          error: null
        };

        if (res.statusCode === 200) {
          if (data.trim() === 'null') {
            result.error = 'Inventory is private or empty';
          } else {
            try {
              const inventory = JSON.parse(data);
              if (inventory.success && inventory.assets) {
                result.hasItems = true;
                result.itemCount = inventory.assets.length;
                result.success = true;
              } else if (inventory.error) {
                result.error = inventory.error;
              } else {
                result.error = 'No items or private inventory';
              }
            } catch (parseError) {
              result.error = `JSON parsing failed: ${parseError.message}`;
            }
          }
        } else {
          result.error = `HTTP ${res.statusCode}`;
        }

        resolve(result);
      });

    }).on('error', (error) => {
      resolve({
        game: game.name,
        appId: game.appId,
        short: game.short,
        statusCode: 0,
        responseLength: 0,
        hasItems: false,
        itemCount: 0,
        error: `Request error: ${error.message}`
      });
    });
  });
}

// Test all games
async function testAllGames() {
  const results = [];

  for (const game of games) {
    console.log(`🧪 Testing ${game.short} (${game.appId})...`);
    const result = await testGame(game);
    results.push(result);

    if (result.hasItems) {
      console.log(`✅ ${game.short}: ${result.itemCount} items found`);
    } else {
      console.log(`❌ ${game.short}: ${result.error}`);
    }
  }

  // Summary
  console.log('');
  console.log('📊 SUMMARY:');
  console.log('===========');

  const gamesWithItems = results.filter(r => r.hasItems);
  const gamesWithError = results.filter(r => !r.hasItems && r.error);

  console.log(`Total games tested: ${results.length}`);
  console.log(`Games with items: ${gamesWithItems.length}`);
  console.log(`Games without items: ${gamesWithError.length}`);

  if (gamesWithItems.length > 0) {
    console.log('');
    console.log('🎮 GAMES WITH ITEMS:');
    gamesWithItems.forEach(result => {
      console.log(`  ✅ ${result.short}: ${result.itemCount} items`);
    });
  }

  if (gamesWithError.length > 0) {
    console.log('');
    console.log('❌ GAMES WITHOUT ITEMS:');
    gamesWithError.forEach(result => {
      console.log(`  ❌ ${result.short}: ${result.error}`);
    });
  }

  // Find best game to use
  const bestGame = gamesWithItems.reduce((best, current) => {
    return current.itemCount > (best?.itemCount || 0) ? current : best;
  }, null);

  if (bestGame) {
    console.log('');
    console.log('🎯 RECOMMENDATION:');
    console.log(`Use ${bestGame.short} (${bestGame.appId}) with ${bestGame.itemCount} items`);
    console.log(`API URL: https://steamcommunity.com/inventory/${steamId}/${bestGame.appId}/2?l=english&count=5000`);
  } else {
    console.log('');
    console.log('💡 TIPS:');
    console.log('1. Make sure your Steam profile is set to Public');
    console.log('2. Make sure your inventory privacy is set to Public');
    console.log('3. Try different games to find one with items');
    console.log('4. Some users only have items in specific games');
  }
}

// Run the test
testAllGames().catch(console.error);