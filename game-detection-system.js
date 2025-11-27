// Game Detection System for Steam Inventory
const https = require('https');

class GameDetectionSystem {
  constructor() {
    // Popular Steam games with their AppIDs and display names
    this.supportedGames = [
      { appId: '570', name: 'Dota 2', category: 'MOBA', icon: '🎮', color: '#6c8eb7' },
      { appId: '730', name: 'Counter-Strike 2', category: 'FPS', icon: '🔫', color: '#e87c00' },
      { appId: '440', name: 'Team Fortress 2', category: 'FPS', icon: '🧩', color: '#6a994e' },
      { appId: '578080', name: 'PUBG: Battlegrounds', category: 'Battle Royale', icon: '🪂', color: '#8c6d31' },
      { appId: '271590', name: 'Grand Theft Auto V', category: 'Action', icon: '🚗', color: '#b8860b' },
      { appId: '359550', name: 'Rocket League', category: 'Sports', icon: '🏎️', color: '#1e90ff' },
      { appId: '252490', name: 'Rust', category: 'Survival', icon: '🔧', color: '#cd853f' },
      { appId: '304930', name: 'Warframe', category: 'Action', icon: '🥷', color: '#4169e1' },
      { appId: '753290', name: 'Dead by Daylight', category: 'Horror', icon: '🔪', color: '#8b0000' },
      { appId: '236390', name: 'ARK: Survival Evolved', category: 'Survival', icon: '🦖', color: '#228b22' },
      { appId: '4000', name: 'Garry\'s Mod', category: 'Sandbox', icon: '🧪', color: '#daa520' },
      { appId: '346110', name: 'Fallout 4', category: 'RPG', icon: '☢️', color: '#ff6b6b' },
      { appId: '221100', name: 'DayZ', category: 'Survival', icon: '🧟', color: '#3cb371' },
      { appId: '816420', name: 'Lost Ark', category: 'MMO', icon: '⚔️', color: '#9370db' },
      { appId: '1172470', name: 'Counter-Strike: Global Offensive', category: 'FPS', icon: '🔫', color: '#e87c00' }
    ];

    this.minRequestInterval = 1000; // 1 second between requests
    this.lastRequestTime = 0;
  }

  // Test a single game inventory
  async testGameInventory(steamId, appId, gameName) {
    return new Promise((resolve) => {
      const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5`;

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
            appId,
            name: gameName,
            hasItems: false,
            itemCount: 0,
            statusCode: res.statusCode,
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

        stream.on('error', (error) => {
          resolve({
            appId,
            name: gameName,
            hasItems: false,
            itemCount: 0,
            statusCode: 0,
            error: `Request error: ${error.message}`
          });
        });
      }).on('error', (error) => {
        resolve({
          appId,
          name: gameName,
          hasItems: false,
          itemCount: 0,
          statusCode: 0,
          error: `Network error: ${error.message}`
        });
      });
    });
  }

  // Wait between requests to avoid rate limiting
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Test all games for a user
  async detectAvailableGames(steamId) {
    console.log(`🔍 Game Detection System: Testing Steam ID ${steamId}`);

    const results = [];
    const workingGames = [];
    const failedGames = [];

    for (let i = 0; i < this.supportedGames.length; i++) {
      const game = this.supportedGames[i];

      console.log(`🧪 Testing ${game.name} (${game.appId})...`);
      const result = await this.testGameInventory(steamId, game.appId, game.name);

      if (result.hasItems && result.itemCount > 0) {
        workingGames.push(result);
        console.log(`✅ ${game.name}: ${result.itemCount} items found`);
      } else {
        failedGames.push(result);
        console.log(`❌ ${game.name}: ${result.error}`);
      }

      results.push(result);

      // Add delay between requests (except for the last one)
      if (i < this.supportedGames.length - 1) {
        await this.delay(this.minRequestInterval);
      }
    }

    // Generate summary
    const summary = {
      steamId,
      totalGames: this.supportedGames.length,
      gamesWithItems: workingGames.length,
      gamesWithoutItems: failedGames.length,
      workingGames: workingGames,
      failedGames: failedGames,
      results
    };

    this.generateDetectionReport(summary);
    return summary;
  }

  // Generate detailed detection report
  generateDetectionReport(summary) {
    console.log('\n📊 GAME DETECTION REPORT');
    console.log('==========================');
    console.log(`Steam ID: ${summary.steamId}`);
    console.log(`Total Games Tested: ${summary.totalGames}`);
    console.log(`Games with Items: ${summary.gamesWithItems}`);
    console.log(`Games without Items: ${summary.gamesWithoutItems}`);

    if (summary.workingGames.length > 0) {
      console.log('\n🎮 GAMES WITH ITEMS:');
      summary.workingGames.forEach(game => {
        console.log(`  ✅ ${game.name} (${game.appId}): ${game.itemCount} items`);
      });
    }

    if (summary.failedGames.length > 0) {
      console.log('\n❌ GAMES WITHOUT ITEMS:');
      summary.failedGames.forEach(game => {
        console.log(`  ❌ ${game.name}: ${game.error}`);
      });
    }

    // Find best game to use
    if (summary.workingGames.length > 0) {
      const bestGame = summary.workingGames.reduce((best, current) =>
        current.itemCount > (best?.itemCount || 0) ? current : best
      );

      console.log('\n🎯 RECOMMENDATION:');
      console.log(`Use ${bestGame.name} (${bestGame.appId}) with ${bestGame.itemCount} items`);
      console.log('This game has the most items in your inventory!');
    } else {
      console.log('\n💡 SOLUTION:');
      console.log('Your Steam profile or inventory is set to private.');
      console.log('To fix this issue:');
      console.log('1. Go to: https://steamcommunity.com/my/edit/settings/');
      console.log('2. Set "Inventory Privacy" to "Public"');
      console.log('3. Set "Profile Privacy" to "Public"');
      console.log('4. Wait a few minutes and try again');
    }
  }

  // Get games organized by category
  getGamesByCategory(games) {
    const byCategory = {};

    games.forEach(game => {
      const category = game.category || 'Unknown';
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(game);
    });

    return byCategory;
  }

  // Get HTML interface for game selection
  generateGameSelectionInterface(steamId, gameResults = null) {
    const games = this.supportedGames;
    const byCategory = this.getGamesByCategory(games);

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Steam Game Inventory Detection</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #1a1a1a;
      color: #fff;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: #2d2d2d;
      border-radius: 10px;
      border: 1px solid #444;
    }
    .category-section {
      margin-bottom: 30px;
      background: #2d2d2d;
      border-radius: 10px;
      padding: 20px;
      border: 1px solid #444;
    }
    .category-title {
      color: #3498db;
      margin-bottom: 15px;
      font-size: 20px;
      border-bottom: 1px solid #444;
      padding-bottom: 10px;
    }
    .game-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 15px;
    }
    .game-card {
      background: #3d3d3d;
      border-radius: 8px;
      padding: 15px;
      border: 1px solid #555;
      transition: all 0.3s ease;
    }
    .game-card:hover {
      border-color: #3498db;
      transform: translateY(-2px);
    }
    .game-header {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }
    .game-icon {
      font-size: 24px;
      margin-right: 10px;
    }
    .game-name {
      font-weight: bold;
      color: #3498db;
      font-size: 16px;
    }
    .game-details {
      color: #b0b0b0;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .inventory-status {
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-available {
      background: #27ae60;
      color: white;
    }
    .status-unavailable {
      background: #e74c3c;
      color: white;
    }
    .inventory-link {
      display: inline-block;
      background: #3498db;
      color: white;
      padding: 8px 16px;
      text-decoration: none;
      border-radius: 4px;
      font-size: 12px;
      margin-top: 10px;
      transition: background 0.3s ease;
    }
    .inventory-link:hover {
      background: #2980b9;
    }
    .nav-buttons {
      text-align: center;
      margin-bottom: 30px;
    }
    .nav-button {
      background: #7289da;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin: 0 10px;
      transition: background 0.3s ease;
    }
    .nav-button:hover {
      background: #677bc4;
    }
    .detection-results {
      background: #2d2d2d;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 30px;
      border: 1px solid #444;
    }
    .result-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .result-card {
      background: #3d3d3d;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #555;
    }
    .result-value {
      font-size: 24px;
      font-weight: bold;
      color: #3498db;
    }
    .result-label {
      color: #b0b0b0;
      font-size: 12px;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎮 Steam Game Inventory Detection</h1>
      <p>Find which games have items in your Steam inventory</p>
    </div>

    <div class="nav-buttons">
      <a href="/" class="nav-button">🏠 Home</a>
      <a href="/api/steam/auth/logout" class="nav-button">👋 Logout</a>
    </div>

    ${gameResults ? `
    <div class="detection-results">
      <h3>📊 Detection Results</h3>
      <div class="result-summary">
        <div class="result-card">
          <div class="result-value">${gameResults.totalGames}</div>
          <div class="result-label">Total Games</div>
        </div>
        <div class="result-card">
          <div class="result-value">${gameResults.gamesWithItems}</div>
          <div class="result-label">Games with Items</div>
        </div>
        <div class="result-card">
          <div class="result-value">${gameResults.gamesWithoutItems}</div>
          <div class="result-label">Games without Items</div>
        </div>
      </div>
    </div>
    ` : ''}

    ${Object.keys(byCategory).map(category => `
      <div class="category-section">
        <div class="category-title">${category}</div>
        <div class="game-grid">
          ${byCategory[category].map(game => `
            <div class="game-card">
              <div class="game-header">
                <span class="game-icon">${game.icon}</span>
                <span class="game-name">${game.name}</span>
              </div>
              <div class="game-details">
                App ID: ${game.appId}<br>
                Category: ${game.category}
              </div>
              <a href="/inventory?steamId=${steamId}&appId=${game.appId}" class="inventory-link">
                View Inventory
              </a>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
    `;
  }
}

module.exports = GameDetectionSystem;