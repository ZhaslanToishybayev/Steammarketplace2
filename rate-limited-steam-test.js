// Rate-Limited Steam Inventory System
const https = require('https');

class RateLimitedSteamInventory {
  constructor() {
    // Steam API rate limiting
    this.minRequestInterval = 2000; // 2 seconds between requests
    this.lastRequestTime = 0;
    this.requestQueue = [];
    this.isProcessing = false;

    // Request throttling
    this.pendingRequests = new Map();
    this.maxConcurrentRequests = 3;
    this.currentRequests = 0;
  }

  // Rate limiting with queue
  async makeRequestWithRateLimit(url, options) {
    return new Promise((resolve, reject) => {
      const request = {
        url,
        options,
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.requestQueue.push(request);
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0 || this.currentRequests >= this.maxConcurrentRequests) {
      return;
    }

    this.isProcessing = true;

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      setTimeout(() => {
        this.processQueue();
      }, this.minRequestInterval - timeSinceLastRequest);
      return;
    }

    const request = this.requestQueue.shift();
    this.currentRequests++;

    try {
      this.lastRequestTime = now;
      await this.executeRequest(request);
    } catch (error) {
      request.reject(error);
    } finally {
      this.currentRequests--;
      this.isProcessing = false;

      // Process next request
      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  async executeRequest(request) {
    return new Promise((resolve, reject) => {
      const { url, options } = request;

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
          if (res.statusCode === 200) {
            resolve(data);
          } else if (res.statusCode === 429) {
            // Retry after delay
            console.log('⏳ Steam API rate limit hit, retrying in 5 seconds...');
            setTimeout(() => {
              this.requestQueue.unshift(request); // Put back at front
              this.processQueue();
            }, 5000);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });

      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  // Test single game with proper headers
  async testSingleGame(steamId, appId, gameName) {
    console.log(`🔍 Testing ${gameName} (AppID: ${appId})...`);

    const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

    const options = {
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
      timeout: 10000 // 10 second timeout
    };

    try {
      const data = await this.makeRequestWithRateLimit(apiUrl, options);

      if (data.trim() === 'null') {
        return {
          success: false,
          game: gameName,
          appId: appId,
          error: 'Inventory is private or empty',
          statusCode: 400,
          items: []
        };
      }

      const inventory = JSON.parse(data);

      if (inventory.success && inventory.assets && inventory.assets.length > 0) {
        const items = this.processInventoryItems(inventory, appId);
        return {
          success: true,
          game: gameName,
          appId: appId,
          items: items,
          totalCount: items.length,
          descriptions: inventory.descriptions || []
        };
      } else if (inventory.error) {
        return {
          success: false,
          game: gameName,
          appId: appId,
          error: inventory.error,
          statusCode: 400,
          items: []
        };
      } else {
        return {
          success: false,
          game: gameName,
          appId: appId,
          error: 'No items found or inventory private',
          statusCode: 400,
          items: []
        };
      }

    } catch (error) {
      console.log(`❌ ${gameName} failed: ${error.message}`);

      if (error.code === 'TIMEOUT') {
        return {
          success: false,
          game: gameName,
          appId: appId,
          error: 'Request timeout - Steam API is slow',
          statusCode: 0,
          items: []
        };
      }

      return {
        success: false,
        game: gameName,
        appId: appId,
        error: error.message,
        statusCode: error.code === 'ECONNRESET' ? 0 : 500,
        items: []
      };
    }
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
          appid: description.appid || appId,
          tradable: description.tradable || false,
          marketable: description.marketable || false,
          type: description.type || ''
        });
      }
    });

    return items;
  }

  // Test games with rate limiting
  async testGamesWithRateLimit(steamId, games) {
    console.log(`🔍 Testing Steam Inventory for ${steamId} with rate limiting`);
    console.log(`🎮 Testing ${games.length} games with ${this.minRequestInterval}ms delay between requests`);
    console.log('================================================================================');

    const results = [];
    const workingGames = [];
    const failedGames = [];

    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      const result = await this.testSingleGame(steamId, game.appId, game.name);

      if (result.success && result.items.length > 0) {
        workingGames.push(result);
        console.log(`✅ ${game.short}: ${result.items.length} items found`);
      } else {
        failedGames.push(result);
        console.log(`❌ ${game.short}: ${result.error}`);
      }

      results.push(result);

      // Add delay between requests (except for the last one)
      if (i < games.length - 1) {
        console.log(`⏳ Waiting ${this.minRequestInterval}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval));
      }
    }

    // Generate summary
    this.generateSummary(steamId, workingGames, failedGames, results);

    return {
      steamId,
      results,
      workingGames,
      failedGames,
      summary: {
        totalGames: games.length,
        workingGames: workingGames.length,
        failedGames: failedGames.length
      }
    };
  }

  // Generate summary report
  generateSummary(steamId, workingGames, failedGames, allResults) {
    console.log('');
    console.log('📊 SUMMARY WITH RATE LIMITING');
    console.log('================================');
    console.log(`Steam ID: ${steamId}`);
    console.log(`Total Games Tested: ${allResults.length}`);
    console.log(`Games with Items: ${workingGames.length}`);
    console.log(`Games without Items: ${failedGames.length}`);
    console.log('');

    if (workingGames.length > 0) {
      console.log('🎮 GAMES WITH ITEMS:');
      workingGames.forEach(game => {
        console.log(`  ✅ ${game.game}: ${game.items.length} items`);
      });
    }

    if (failedGames.length > 0) {
      console.log('');
      console.log('❌ FAILED GAMES:');
      const errorCounts = {};
      failedGames.forEach(game => {
        const errorType = game.error.includes('timeout') ? 'Timeout' :
                         game.error.includes('429') ? 'Rate Limit' :
                         game.error.includes('400') ? 'Bad Request' :
                         'Other';
        errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
      });

      Object.keys(errorCounts).forEach(errorType => {
        console.log(`  ${errorType}: ${errorCounts[errorType]} games`);
      });
    }

    console.log('');
    console.log('💡 ANALYSIS:');
    if (failedGames.length > 0) {
      const timeoutErrors = failedGames.filter(g => g.error.includes('timeout')).length;
      const rateLimitErrors = failedGames.filter(g => g.error.includes('429')).length;

      if (timeoutErrors > 0) {
        console.log('  🔴 Many timeout errors - Steam API might be slow or blocking requests');
      }
      if (rateLimitErrors > 0) {
        console.log('  🟡 Rate limit errors detected - need more delay between requests');
      }
      if (timeoutErrors === 0 && rateLimitErrors === 0) {
        console.log('  🔵 No rate limiting issues - profile might be genuinely private');
      }
    }
  }
}

// Popular games to test
const games = [
  { appId: '730', name: 'Counter-Strike 2', short: 'CS2' },
  { appId: '570', name: 'Dota 2', short: 'Dota 2' },
  { appId: '440', name: 'Team Fortress 2', short: 'TF2' },
  { appId: '271590', name: 'Grand Theft Auto V', short: 'GTA V' },
  { appId: '359550', name: 'Rocket League', short: 'Rocket League' }
];

// Test function
async function testWithRateLimiting() {
  const inventory = new RateLimitedSteamInventory();
  const steamId = '76561199257487454';

  console.log('🚀 STARTING RATE-LIMITED STEAM INVENTORY TEST');
  console.log('==============================================');
  console.log('This test will:');
  console.log('1. Wait 2 seconds between each request');
  console.log('2. Use proper browser headers');
  console.log('3. Handle rate limiting gracefully');
  console.log('4. Provide detailed analysis');
  console.log('');

  const result = await inventory.testGamesWithRateLimit(steamId, games);

  console.log('');
  console.log('🎯 FINAL ANALYSIS:');

  if (result.workingGames.length > 0) {
    console.log('✅ Found games with items! Your Steam profile is working correctly.');
    const bestGame = result.workingGames[0];
    console.log(`🎮 Best game: ${bestGame.game} with ${bestGame.items.length} items`);
  } else {
    console.log('❌ No games with items found.');
    console.log('This could mean:');
    console.log('1. Your Steam profile is set to private');
    console.log('2. Your inventory is empty for these games');
    console.log('3. Steam API is temporarily blocking requests');
    console.log('4. Your Steam ID might be incorrect');
    console.log('');
    console.log('🔧 RECOMMENDATION:');
    console.log('1. Double-check your Steam profile privacy settings');
    console.log('2. Try testing with a different Steam ID');
    console.log('3. Wait and retry later if Steam API is overloaded');
  }

  return result;
}

// Export for use in other modules
module.exports = RateLimitedSteamInventory;

// If run directly, test the system
if (require.main === module) {
  testWithRateLimiting()
    .then(result => {
      console.log('');
      console.log('🏁 TEST COMPLETED');
      console.log(`Results: ${result.workingGames.length}/${result.summary.totalGames} games working`);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
    });
}