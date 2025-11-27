// Enhanced Steam Inventory System with Multi-Game Support
const https = require('https');
const fs = require('fs');
const path = require('path');

class EnhancedSteamInventory {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.maxRetries = 3;
    this.baseDelay = 1000;

    // Popular game configurations
    this.games = [
      { appId: '730', name: 'Counter-Strike 2', short: 'CS2', category: 'Shooters' },
      { appId: '570', name: 'Dota 2', short: 'Dota 2', category: 'MOBA' },
      { appId: '440', name: 'Team Fortress 2', short: 'TF2', category: 'Shooters' },
      { appId: '578080', name: 'PUBG: Battlegrounds', short: 'PUBG', category: 'Battle Royale' },
      { appId: '271590', name: 'Grand Theft Auto V', short: 'GTA V', category: 'Action' },
      { appId: '359550', name: 'Rocket League', short: 'Rocket League', category: 'Sports' },
      { appId: '252490', name: 'Rust', short: 'Rust', category: 'Survival' },
      { appId: '304930', name: 'Warframe', short: 'Warframe', category: 'Action' },
      { appId: '753290', name: 'Dead by Daylight', short: 'DBD', category: 'Horror' },
      { appId: '236390', name: 'ARK: Survival Evolved', short: 'ARK', category: 'Survival' },
      { appId: '4000', name: 'Garry\'s Mod', short: 'GMod', category: 'Sandbox' },
      { appId: '346110', name: 'Fallout 4', short: 'Fallout 4', category: 'RPG' },
      { appId: '221100', name: 'DayZ', short: 'DayZ', category: 'Survival' },
      { appId: '816420', name: 'Lost Ark', short: 'Lost Ark', category: 'MMO' },
      { appId: '1172470', name: 'Counter-Strike: Global Offensive', short: 'CS:GO', category: 'Shooters' }
    ];
  }

  // Test inventory for a specific game
  async testGameInventory(steamId, appId, gameName) {
    const cacheKey = `${steamId}_${appId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    console.log(`🔍 Testing ${gameName} (AppID: ${appId})...`);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

        const options = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive'
          }
        };

        const data = await this.makeRequest(apiUrl, options);

        if (data.trim() === 'null') {
          const result = {
            success: false,
            game: gameName,
            appId: appId,
            error: 'Inventory is private or empty',
            statusCode: 400,
            items: []
          };

          this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        }

        const inventory = JSON.parse(data);

        if (inventory.success && inventory.assets && inventory.assets.length > 0) {
          const items = this.processInventoryItems(inventory, appId);
          const result = {
            success: true,
            game: gameName,
            appId: appId,
            items: items,
            totalCount: items.length,
            descriptions: inventory.descriptions || []
          };

          this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;

        } else if (inventory.error) {
          const result = {
            success: false,
            game: gameName,
            appId: appId,
            error: inventory.error,
            statusCode: 400,
            items: []
          };

          this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        } else {
          const result = {
            success: false,
            game: gameName,
            appId: appId,
            error: 'No items found or inventory private',
            statusCode: 400,
            items: []
          };

          this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        }

      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed for ${gameName}: ${error.message}`);

        if (attempt === this.maxRetries) {
          const result = {
            success: false,
            game: gameName,
            appId: appId,
            error: `Request failed after ${this.maxRetries} attempts: ${error.message}`,
            statusCode: 0,
            items: []
          };

          this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        }

        // Exponential backoff
        await this.delay(this.baseDelay * Math.pow(2, attempt - 1));
      }
    }
  }

  // Make HTTP request with gzip support
  makeRequest(url, options) {
    return new Promise((resolve, reject) => {
      https.get(url, options, (res) => {
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
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          } else {
            resolve(data);
          }
        });

      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  // Process inventory items
  processInventoryItems(inventory, appId) {
    const items = [];

    if (!inventory.assets || !inventory.descriptions) {
      return items;
    }

    inventory.assets.forEach(asset => {
      const description = inventory.descriptions.find(desc =>
        desc.classid === asset.classid && desc.instanceid === asset.instanceid
      );

      if (description) {
        items.push({
          assetid: asset.assetid,
          classid: asset.classid,
          instanceid: asset.instanceid,
          amount: parseInt(asset.amount) || 1,
          name: description.name || 'Unknown Item',
          market_name: description.market_name || description.name || 'Unknown Item',
          market_hash_name: description.market_hash_name || description.name || 'Unknown_Item',
          appid: description.appid || appId,
          contextid: description.contextid || '2',
          tradable: description.tradable || false,
          marketable: description.marketable || false,
          commodity: description.commodity || false,
          type: description.type || '',
          description: description.description || '',
          icon_url: description.icon_url || '',
          icon_url_large: description.icon_url_large || '',
          background_color: description.background_color || '',
          name_color: description.name_color || '',
          fraudwarnings: description.fraudwarnings || [],
          tags: description.tags || []
        });
      }
    });

    return items;
  }

  // Test all games
  async testAllGames(steamId) {
    console.log(`🔍 Testing Steam Inventory for ${steamId} across ${this.games.length} games`);
    console.log('================================================================================');

    const results = [];
    const workingGames = [];
    const failedGames = [];

    for (const game of this.games) {
      const result = await this.testGameInventory(steamId, game.appId, game.name);

      if (result.success && result.items.length > 0) {
        workingGames.push(result);
        console.log(`✅ ${game.short}: ${result.items.length} items found`);
      } else {
        failedGames.push(result);
        console.log(`❌ ${game.short}: ${result.error}`);
      }

      results.push(result);
    }

    // Generate summary report
    this.generateSummaryReport(steamId, workingGames, failedGames, results);

    return {
      steamId,
      results,
      workingGames,
      failedGames,
      summary: {
        totalGames: this.games.length,
        workingGames: workingGames.length,
        failedGames: failedGames.length
      }
    };
  }

  // Generate detailed summary report
  generateSummaryReport(steamId, workingGames, failedGames, allResults) {
    console.log('');
    console.log('📊 DETAILED SUMMARY REPORT');
    console.log('===========================');
    console.log(`Steam ID: ${steamId}`);
    console.log(`Total Games Tested: ${allResults.length}`);
    console.log(`Games with Items: ${workingGames.length}`);
    console.log(`Games without Items: ${failedGames.length}`);
    console.log('');

    if (workingGames.length > 0) {
      console.log('🎮 GAMES WITH ITEMS:');
      console.log('====================');

      // Group by category
      const byCategory = {};
      workingGames.forEach(game => {
        const category = this.getGameCategory(game.appId);
        if (!byCategory[category]) {
          byCategory[category] = [];
        }
        byCategory[category].push(game);
      });

      Object.keys(byCategory).sort().forEach(category => {
        console.log(`\n📂 ${category}:`);
        byCategory[category].forEach(game => {
          console.log(`  ✅ ${game.game} (${game.appId}): ${game.items.length} items`);
        });
      });

      console.log('');

      // Show total items per game
      console.log('📈 ITEMS BREAKDOWN:');
      workingGames.sort((a, b) => b.items.length - a.items.length).forEach(game => {
        console.log(`  ${game.game}: ${game.items.length} items`);
      });

      // Find game with most items
      const bestGame = workingGames.reduce((best, current) =>
        current.items.length > (best?.items.length || 0) ? current : best
      );

      console.log('');
      console.log('🎯 RECOMMENDATION:');
      console.log(`Use ${bestGame.game} (${bestGame.appId}) with ${bestGame.items.length} items`);
      console.log(`This game has the most items in your inventory!`);

    } else {
      console.log('❌ NO GAMES WITH ITEMS FOUND');
      console.log('=============================');
      console.log('');
      console.log('💡 SOLUTION:');
      console.log('Your Steam profile or inventory is set to private.');
      console.log('To fix this issue:');
      console.log('');
      console.log('1. Go to: https://steamcommunity.com/my/edit/settings/');
      console.log('2. Set "Inventory Privacy" to "Public"');
      console.log('3. Set "Profile Privacy" to "Public"');
      console.log('4. Wait a few minutes and try again');
      console.log('');
      console.log('🔧 ALTERNATIVE:');
      console.log('Use demo inventory for testing: /inventory-demo');
    }

    if (failedGames.length > 0) {
      console.log('');
      console.log('❌ FAILED GAMES:');
      console.log('================');
      failedGames.forEach(game => {
        console.log(`  ${game.game}: ${game.error}`);
      });
    }
  }

  // Get game category
  getGameCategory(appId) {
    const game = this.games.find(g => g.appId === appId);
    return game ? game.category : 'Unknown';
  }

  // Get demo inventory for testing
  getDemoInventory() {
    const demoItems = [
      {
        "assetid": "1502345678901234567",
        "classid": "123456789",
        "instanceid": "0",
        "amount": 1,
        "name": "AK-47 | Redline (Field-Tested)",
        "market_name": "AK-47 | Redline (Field-Tested)",
        "market_hash_name": "AK-47%20Redline%20Field-Tested",
        "appid": "730",
        "contextid": "2",
        "tradable": true,
        "marketable": true,
        "commodity": false,
        "type": "Covert Rifle",
        "description": "Color: Red-Tinted",
        "icon_url": "ak47_redline_ft.png",
        "icon_url_large": "ak47_redline_ft_large.png",
        "background_color": "eb4b4b",
        "name_color": "eb4b4b",
        "fraudwarnings": [],
        "tags": [
          {"name": "Rifle", "category": "Type", "internal_name": "weapon_rifle"},
          {"name": "Covert", "category": "Rarity", "internal_name": "Rarity_Ancient_Weapon"},
          {"name": "AK-47", "category": "Weapon", "internal_name": "weapon_ak47"}
        ]
      },
      {
        "assetid": "2502345678901234568",
        "classid": "987654321",
        "instanceid": "0",
        "amount": 1,
        "name": "M4A1-S | Blood Tiger (Factory New)",
        "market_name": "M4A1-S | Blood Tiger (Factory New)",
        "market_hash_name": "M4A1-S%20Blood%20Tiger%20Factory%20New",
        "appid": "730",
        "contextid": "2",
        "tradable": true,
        "marketable": true,
        "commodity": false,
        "type": "Covert Rifle",
        "description": "Color: Bright Red",
        "icon_url": "m4a1s_blood_tiger_fn.png",
        "icon_url_large": "m4a1s_blood_tiger_fn_large.png",
        "background_color": "eb4b4b",
        "name_color": "eb4b4b",
        "fraudwarnings": [],
        "tags": [
          {"name": "Rifle", "category": "Type", "internal_name": "weapon_rifle"},
          {"name": "Covert", "category": "Rarity", "internal_name": "Rarity_Ancient_Weapon"},
          {"name": "M4A1-S", "category": "Weapon", "internal_name": "weapon_m4a1_s"}
        ]
      }
    ];

    return {
      success: true,
      game: "Counter-Strike 2 (Demo)",
      appId: "730",
      items: demoItems,
      totalCount: demoItems.length,
      isDemo: true,
      message: "This is demo inventory data for testing purposes"
    };
  }

  // Delay utility
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('✅ Cache cleared');
  }
}

// Export for use in other modules
module.exports = EnhancedSteamInventory;

// If run directly, test the system
if (require.main === module) {
  const inventory = new EnhancedSteamInventory();
  const steamId = '76561199257487454';

  inventory.testAllGames(steamId)
    .then(result => {
      console.log('');
      console.log('🎯 FINAL RECOMMENDATION:');
      if (result.workingGames.length > 0) {
        const bestGame = result.workingGames.reduce((best, current) =>
          current.items.length > (best?.items.length || 0) ? current : best
        );
        console.log(`Use ${bestGame.game} (${bestGame.appId}) for your marketplace!`);
      } else {
        console.log('Set your Steam inventory to Public to access real items,');
        console.log('or use demo inventory at /inventory-demo for testing.');
      }
    })
    .catch(error => {
      console.error('❌ Error testing games:', error);
    });
}