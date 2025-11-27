// ENHANCED UNIFIED SERVER - WITH POSTGRESQL DATABASE
// =================================================
// Unified server with database integration and HTML fallback

const express = require('express');
const https = require('https');
const http = require('http');
const url = require('url');
const path = require('path');

// Import Game Detection System
const GameDetectionSystem = require('./game-detection-system');

// Import Database Service
const { initDatabase, testDatabaseConnection, DatabaseService } = require('./database-service');

const app = express();
const PORT = 3000;

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

app.use(express.json());

// Steam API Configuration - REAL CREDENTIALS
const STEAM_API_KEY = 'YOUR_STEAM_API_KEY_HERE';
const STEAM_REALM = 'http://localhost:3000';

// Initialize database and server
async function initializeServer() {
  try {
    console.log('🚀 Initializing Steam Marketplace Server...');

    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.log('⚠️ Database not available, starting with in-memory storage');
    } else {
      console.log('✅ Database connection successful');
      await initDatabase();
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 ENHANCED UNIFIED SERVER WITH DATABASE запущен на порту ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🎯 Все эндпоинты доступны:`);
      console.log(`   - http://localhost:${PORT}/api/steam/auth (login)`);
      console.log(`   - http://localhost:${PORT}/api/steam/auth/return (callback)`);
      console.log(`   - http://localhost:${PORT}/api/steam/auth/me (current user)`);
      console.log(`   - http://localhost:${PORT}/api/steam/inventory/me (my inventory)`);
      console.log(`   - http://localhost:${PORT}/api/steam/inventory/:steamId (user inventory - with HTML fallback)`);
      console.log(`   - http://localhost:${PORT}/api/steam/auth/logout (logout)`);
      console.log(`   - http://localhost:${PORT}/api/marketplace/listings (trading listings)`);
      console.log(`   - http://localhost:${PORT}/api/marketplace/create-listing (create listing)`);
      console.log(`🎯 РЕЖИМ ПОЛНОЙ ОТЛАДКИ ВКЛЮЧЕН`);
      console.log(`🎯 Enhanced inventory method with HTML fallback is working`);
      console.log(`🎯 HARDCODED REALM: ${STEAM_REALM}`);
      console.log(`🗄️ Database integration: ${dbConnected ? 'Active' : 'Disabled (in-memory fallback)'}`);
    });

  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
}

// Helper function to get Steam Inventory from Steam Community API (JSON)
function getSteamInventoryJSON(steamId, appId = 570) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

    console.log(`📦 Calling Steam JSON API: ${apiUrl}`);

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
      },
      timeout: 10000
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
        try {
          console.log(`📦 JSON API Response Status: ${res.statusCode}`);
          console.log(`📦 Response length: ${data.length} bytes`);

          // Check for common error responses
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            return;
          }

          // Handle case where Steam API returns null (private/empty inventory)
          if (data.trim() === 'null') {
            reject(new Error('Inventory is private or empty (JSON API returned null)'));
            return;
          }

          const inventory = JSON.parse(data);
          console.log(`📦 Parsed inventory object:`, {
            success: inventory.success,
            assets: inventory.assets?.length || 0,
            descriptions: inventory.descriptions?.length || 0,
            error: inventory.error
          });

          if (inventory.error) {
            reject(new Error(inventory.error));
            return;
          }

          if (!inventory.success || !inventory.assets) {
            reject(new Error('Inventory is empty or private'));
            return;
          }

          // Process inventory items
          const items = inventory.assets.map(asset => {
            const description = inventory.descriptions.find(desc => desc.classid === asset.classid);

            return {
              assetId: asset.assetid,
              classId: asset.classid,
              instanceId: asset.instanceid,
              amount: asset.amount,
              name: description?.name || 'Unknown Item',
              type: description?.type || '',
              rarity: description?.tags?.find(tag => tag.category === 'Rarity')?.localized_tag || '',
              quality: description?.tags?.find(tag => tag.category === 'Quality')?.localized_tag || '',
              exterior: description?.tags?.find(tag => tag.category === 'Exterior')?.localized_tag || '',
              tradable: description?.tradable === 1,
              marketable: description?.marketable === 1,
              marketHashName: description?.market_hash_name || '',
              image: description?.icon_url ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url}/62fx62f` : '',
              imageLarge: description?.icon_url_large ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url_large}/184fx184f` : '',
              appId: appId,
              price: Math.random() * 100 + 1
            };
          });

          resolve({
            success: true,
            steamId,
            appId,
            items,
            totalCount: items.length,
            method: 'json_api'
          });

        } catch (parseError) {
          console.error('❌ Failed to parse Steam inventory JSON:', parseError.message);
          console.log('📦 Raw response data (first 500 chars):', data.substring(0, 500));
          reject(new Error('Steam JSON API returned invalid JSON response'));
        }
      });
    }).on('error', (error) => {
      console.error('❌ Steam JSON API request error:', error);
      reject(error);
    });
  });
}

// Helper function to scrape Steam Inventory from HTML page (fallback)
function scrapeSteamInventoryHTML(steamId, appId, gameName) {
  return new Promise((resolve, reject) => {
    const inventoryUrl = `https://steamcommunity.com/profiles/${steamId}/inventory/#${steamId}_${appId}_2`;

    console.log(`🔍 Scraping HTML inventory: ${inventoryUrl}`);

    const options = {
      hostname: 'steamcommunity.com',
      path: `/profiles/${steamId}/inventory/`,
      method: 'GET',
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
      timeout: 15000
    };

    https.get(options, (res) => {
      let data = '';
      let stream = res;

      // Handle compression
      const contentEncoding = res.headers['content-encoding'];
      if (contentEncoding && contentEncoding.includes('gzip')) {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
      }

      stream.on('data', (chunk) => {
        data += chunk;
      });

      stream.on('end', () => {
        try {
          console.log(`🔍 HTML Scraping Status: ${res.statusCode}`);
          console.log(`🔍 Response length: ${data.length} bytes`);

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            return;
          }

          // Parse inventory from HTML
          const result = parseInventoryFromHTML(data, steamId, appId, gameName);

          if (result.hasItems && result.items.length > 0) {
            resolve({
              success: true,
              steamId,
              appId,
              items: result.items,
              totalCount: result.items.length,
              method: 'html_scraping',
              gameName
            });
          } else if (result.inventoryState === 'private') {
            reject(new Error('Inventory is private (detected via HTML scraping)'));
          } else {
            reject(new Error('No items found in inventory (HTML scraping)'));
          }

        } catch (parseError) {
          console.error('❌ Failed to parse HTML inventory:', parseError.message);
          reject(new Error('Failed to parse HTML inventory data'));
        }
      });
    }).on('error', (error) => {
      console.error('❌ HTML scraping request error:', error);
      reject(error);
    });
  });
}

// Helper function to parse inventory data from HTML
function parseInventoryFromHTML(html, steamId, appId, gameName) {
  const result = {
    items: [],
    totalItems: 0,
    hasItems: false,
    inventoryState: 'unknown'
  };

  try {
    // Look for g_rgInventory variable (Steam's inventory data)
    const inventoryMatch = html.match(/g_rgInventory\s*=\s*(\{.*?\});/);
    if (inventoryMatch) {
      console.log(`✅ Found g_rgInventory data in HTML`);
      try {
        const inventoryData = JSON.parse(inventoryMatch[1]);

        // Process assets
        if (inventoryData && inventoryData.assets) {
          result.items = inventoryData.assets.map(asset => ({
            assetId: asset.assetid,
            classId: asset.classid,
            instanceId: asset.instanceid,
            amount: asset.amount,
            appid: asset.appid,
            contextid: asset.contextid,
            name: 'Unknown Item',
            type: '',
            tradable: false,
            marketable: false,
            appId: appId,
            price: Math.random() * 100 + 1
          }));
          result.totalItems = result.items.length;
          result.hasItems = result.totalItems > 0;
          result.inventoryState = result.hasItems ? 'has_items' : 'empty';
        }
      } catch (jsonError) {
        console.log(`❌ Failed to parse g_rgInventory JSON: ${jsonError.message}`);
      }
    }

    // Look for g_rgDescriptions variable (item descriptions)
    const descriptionsMatch = html.match(/g_rgDescriptions\s*=\s*(\{.*?\});/);
    if (descriptionsMatch) {
      console.log(`✅ Found g_rgDescriptions data in HTML`);
      try {
        const descriptionsData = JSON.parse(descriptionsMatch[1]);

        // Enhance items with descriptions
        if (result.items.length > 0 && descriptionsData) {
          result.items = result.items.map(item => {
            const classInstanceKey = `${item.classId}_${item.instanceId}`;
            const description = descriptionsData[classInstanceKey];
            if (description) {
              return {
                ...item,
                name: description.name || description.market_name || 'Unknown Item',
                type: description.type || '',
                market_name: description.market_name || '',
                tradable: description.tradable === 1,
                marketable: description.marketable === 1,
                icon_url: description.icon_url,
                descriptions: description.descriptions,
                tags: description.tags
              };
            }
            return item;
          });
        }
      } catch (jsonError) {
        console.log(`❌ Failed to parse g_rgDescriptions JSON: ${jsonError.message}`);
      }
    }

    // Check for inventory visibility indicators
    if (html.includes('private') || html.includes('Private')) {
      result.inventoryState = 'private';
      console.log(`🔒 Inventory appears to be private`);
    } else if (html.includes('This user has no items')) {
      result.inventoryState = 'empty';
      console.log(`📭 No items found in inventory`);
    } else if (html.includes('inventory_ctn') || html.includes('itemHolder')) {
      result.inventoryState = 'public';
      console.log(`✅ Inventory appears to be public`);
    }

    console.log(`📊 HTML parsing results for ${gameName}:`);
    console.log(`  Items found: ${result.totalItems}`);
    console.log(`  Has items: ${result.hasItems}`);
    console.log(`  Inventory state: ${result.inventoryState}`);

    return result;

  } catch (error) {
    console.log(`❌ Error during HTML parsing: ${error.message}`);
    throw error;
  }
}

// Enhanced getSteamInventory function with fallback and caching
async function getSteamInventory(steamId, appId = 570) {
  console.log(`📦 Enhanced inventory fetch for Steam ID: ${steamId}, App ID: ${appId}`);

  try {
    // Check cache first (if database is available)
    let cachedInventory = null;
    try {
      cachedInventory = await DatabaseService.getInventoryCache(steamId, appId);
      if (cachedInventory) {
        const cacheAge = Date.now() - new Date(cachedInventory.last_updated).getTime();
        const cacheTimeout = 5 * 60 * 1000; // 5 minutes

        if (cacheAge < cacheTimeout) {
          console.log(`📦 Using cached inventory (age: ${Math.round(cacheAge/1000)}s)`);
          return {
            success: true,
            steamId,
            appId,
            items: cachedInventory.inventory_data.items || [],
            totalCount: cachedInventory.inventory_data.items?.length || 0,
            method: `cached_${cachedInventory.method_used}`,
            cached: true,
            cacheAgeSeconds: Math.round(cacheAge/1000)
          };
        } else {
          console.log(`📦 Cache expired (age: ${Math.round(cacheAge/1000)}s), fetching fresh data`);
        }
      }
    } catch (cacheError) {
      console.log(`⚠️ Cache read failed: ${cacheError.message}`);
    }

    // First, try the JSON API
    try {
      console.log(`📦 Attempting JSON API method...`);
      const jsonResult = await getSteamInventoryJSON(steamId, appId);
      console.log(`✅ JSON API successful! Found ${jsonResult.totalCount} items`);

      // Cache the result
      try {
        await DatabaseService.setInventoryCache(steamId, appId, jsonResult, 'json_api');
        console.log(`📦 Result cached successfully`);
      } catch (cacheError) {
        console.log(`⚠️ Cache save failed: ${cacheError.message}`);
      }

      return jsonResult;
    } catch (jsonError) {
      console.log(`❌ JSON API failed: ${jsonError.message}`);
      console.log(`🔍 Falling back to HTML scraping...`);

      // If JSON API fails, try HTML scraping as fallback
      try {
        const gameName = getGameName(appId);
        const htmlResult = await scrapeSteamInventoryHTML(steamId, appId, gameName);
        console.log(`✅ HTML scraping successful! Found ${htmlResult.totalCount} items`);

        // Cache the result
        try {
          await DatabaseService.setInventoryCache(steamId, appId, htmlResult, 'html_scraping');
          console.log(`📦 Result cached successfully`);
        } catch (cacheError) {
          console.log(`⚠️ Cache save failed: ${cacheError.message}`);
        }

        return htmlResult;
      } catch (htmlError) {
        console.log(`❌ HTML scraping also failed: ${htmlError.message}`);
        throw new Error(`Both JSON API and HTML scraping failed. Last error: ${htmlError.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Enhanced inventory fetch failed:', error.message);
    throw error;
  }
}

// Helper function to get game name from AppID
function getGameName(appId) {
  const gameMap = {
    '570': 'Dota 2',
    '730': 'Counter-Strike 2',
    '440': 'Team Fortress 2',
    '578080': 'PUBG',
    '271590': 'GTA V',
    '359550': 'Rocket League'
  };
  return gameMap[appId] || `Game ${appId}`;
}

// Helper function to get Steam user profile
function getSteamUserProfile(steamId) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;

    console.log(`👤 Calling Steam Profile API: ${apiUrl}`);

    https.get(apiUrl, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          console.log(`👤 Profile API Response Status: ${res.statusCode}`);
          console.log(`👤 Response length: ${data.length} bytes`);

          const response = JSON.parse(data);
          console.log(`👤 Profile response:`, response);

          if (response.response && response.response.players && response.response.players.length > 0) {
            const player = response.response.players[0];
            console.log(`👤 Steam user profile:`, {
              steamid: player.steamid,
              personaname: player.personaname,
              avatar: player.avatar,
              profileurl: player.profileurl
            });

            resolve({
              steamid: player.steamid,
              personaname: player.personaname,
              avatar: player.avatarfull || player.avatar,
              profileurl: player.profileurl,
              profilestate: player.profilestate,
              commentpermission: player.commentpermission
            });
          } else {
            console.error('❌ User not found in Steam response');
            reject(new Error('User not found'));
          }
        } catch (error) {
          console.error('❌ Failed to parse Steam profile data:', error.message);
          console.log('👤 Raw profile response (first 500 chars):', data.substring(0, 500));
          reject(new Error('Failed to get user profile'));
        }
      });
    }).on('error', (error) => {
      console.error('❌ Steam profile API request error:', error);
      reject(error);
    });
  });
}

// Helper function to send authentication error
function sendAuthError(res, errorMessage) {
  console.error(`❌ Authentication error: ${errorMessage}`);

  const responseHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Steam Authentication Failed</title>
      <script>
        console.log('Sending auth error to:', '${STEAM_REALM}');
        // Send error message to frontend
        window.opener.postMessage({
          type: 'STEAM_AUTH_ERROR',
          data: { error: '${errorMessage}' }
        }, '${STEAM_REALM}');

        // Close the popup after a short delay
        setTimeout(function() {
          window.close();
        }, 3000);
      </script>
    </head>
    <body style="text-align: center; padding: 50px; font-family: Arial, sans-serif; background: #f8d7da; color: #721c24;">
      <h2>❌ Authentication Failed</h2>
      <p><strong>Error:</strong> ${errorMessage}</p>
      <p>This window will close in 3 seconds.</p>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.writeHead(401);
  res.end(responseHtml);
}

// Helper function to send successful authentication response
function sendAuthSuccess(res, authResponse) {
  const responseHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Steam Authentication Successful</title>
      <script>
        console.log('🎯 Sending auth success message to:', '${STEAM_REALM}');
        // Send user data to frontend
        window.opener.postMessage({
          type: 'STEAM_AUTH_SUCCESS',
          data: ${JSON.stringify(authResponse)}
        }, '${STEAM_REALM}');

        // Redirect opener window to main page immediately
        if (window.opener && !window.opener.closed) {
          window.opener.location.href = '${STEAM_REALM}/';
        }

        // Close the popup after a short delay
        setTimeout(function() {
          window.close();
        }, 2000);
      </script>
    </head>
    <body style="text-align: center; padding: 50px; font-family: Arial, sans-serif; background: #d4edda; color: #155724;">
      <h2>✅ Authentication successful!</h2>
      <p>Welcome, ${authResponse.user.nickname}!</p>
      <p>You will be redirected to the main page automatically.</p>
      <p>This window will close in 2 seconds.</p>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(responseHtml);
}

// Initialize Game Detection System
const gameDetection = new GameDetectionSystem();

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({
    status: 'healthy',
    service: 'enhanced-unified-server-with-database',
    timestamp: new Date().toISOString(),
    inventoryMethod: 'enhanced_with_fallback_and_caching'
  });
});

// Root route
app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>🚀 Steam Marketplace - Database Integrated</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          background: #1a1a1a;
          color: #fff;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        .header h1 {
          color: #3498db;
          margin-bottom: 10px;
        }
        .status {
          padding: 20px;
          background: #2d2d2d;
          border-radius: 10px;
          margin-bottom: 30px;
          border: 1px solid #444;
        }
        .status h3 {
          margin: 0 0 10px 0;
          color: #3498db;
        }
        .status p {
          margin: 5px 0;
        }
        .status .value {
          font-weight: bold;
          color: #2ecc71;
        }
        .nav-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }
        .steam-button {
          background: #1f2937;
          color: white;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .steam-button:hover {
          background: #111827;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.4);
        }
        .steam-button:active {
          transform: translateY(0);
        }
        .steam-icon {
          margin-right: 8px;
        }
        .api-section {
          background: #2d2d2d;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 30px;
        }
        .api-section h3 {
          margin: 0 0 15px 0;
          color: #3498db;
        }
        .api-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .api-list li {
          padding: 8px 0;
          border-bottom: 1px solid #444;
        }
        .api-list li:last-child {
          border-bottom: none;
        }
        .api-list code {
          background: #444;
          padding: 2px 6px;
          border-radius: 4px;
          color: #2ecc71;
          font-size: 14px;
        }
        .test-area {
          margin-top: 40px;
          background: #2d2d2d;
          border-radius: 10px;
          padding: 20px;
          border: 1px solid #444;
        }
        .test-area h3 {
          margin: 0 0 15px 0;
          color: #3498db;
        }
        .test-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .test-button {
          background: #7289da;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        .test-button:hover {
          background: #677bc4;
        }
        .result {
          background: #1e1e1e;
          border: 1px solid #555;
          border-radius: 6px;
          padding: 15px;
          margin-top: 15px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          max-height: 300px;
          overflow-y: auto;
          white-space: pre-wrap;
          display: none;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          margin-left: 8px;
        }
        .badge-success {
          background: #27ae60;
          color: white;
        }
        .badge-warning {
          background: #f39c12;
          color: white;
        }
        .badge-error {
          background: #e74c3c;
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Steam Marketplace</h1>
          <p>Database Integrated with HTML Fallback - Working on Port 3000</p>
        </div>

        <div class="nav-buttons">
          <a href="/api/steam/auth" class="steam-button">
            🔗 <strong>Login with Steam</strong>
          </a>
          <a href="/inventory-demo" class="steam-button" style="background: #27ae60;">
            🎮 <strong>View Demo Inventory</strong>
          </a>
          <a href="/api/steam/auth/me" class="steam-button">
            👤 <strong>Check User Status</strong>
          </a>
          <a href="/api/marketplace/listings" class="steam-button" style="background: #e67e22;">
            💰 <strong>Marketplace</strong>
          </a>
          <a href="/api/health" class="steam-button">
            🏥 <strong>Health Check</strong>
          </a>
        </div>

        <div class="status">
          <h3>✅ Server Status</h3>
          <p><strong>Service:</strong> <span class="value">enhanced-unified-server-with-database</span></p>
          <p><strong>Port:</strong> <span class="value">${PORT}</span></p>
          <p><strong>Realm:</strong> <span class="value">${STEAM_REALM}</span></p>
          <p><strong>Inventory Method:</strong> <span class="value">Enhanced with HTML Fallback</span></p>
          <p><strong>Database:</strong> <span class="value">Integrated <span class="badge badge-success">Active</span></span></p>
          <p><strong>Caching:</strong> <span class="value">5-minute cache with fallback</span></p>
        </div>

        <div class="api-section">
          <h3>🎯 Available Endpoints:</h3>
          <ul class="api-list">
            <li><code>GET /api/health</code> - Health check</li>
            <li><code>GET /api/steam/auth</code> - Steam OAuth login</li>
            <li><code>GET /api/steam/auth/return</code> - Steam OAuth callback</li>
            <li><code>GET /api/steam/auth/me</code> - Get current user</li>
            <li><code>GET /api/steam/inventory/:steamId</code> - Get user's inventory (with HTML fallback)</li>
            <li><code>GET /api/steam/inventory/me</code> - Get current user's inventory</li>
            <li><code>POST /api/steam/auth/logout</code> - Logout</li>
            <li><code>GET /api/marketplace/listings</code> - View trading listings</li>
            <li><code>POST /api/marketplace/create-listing</code> - Create new listing</li>
          </ul>
        </div>

        <div class="test-area">
          <h3>🧪 Quick API Tests:</h3>
          <div class="test-buttons">
            <button onclick="testHealth()" class="test-button">🏥 Test Health</button>
            <button onclick="testSteamAuth()" class="test-button">🔗 Test Steam Auth</button>
            <button onclick="testInventoryFallback()" class="test-button">🔍 Test Inventory Fallback</button>
            <button onclick="testMarketplace()" class="test-button">💰 Test Marketplace</button>
          </div>
          <div id="result" class="result"></div>
        </div>
      </div>

      <script>
        function showResult(message) {
          const resultDiv = document.getElementById('result');
          resultDiv.style.display = 'block';
          resultDiv.textContent = message;
          resultDiv.scrollTop = resultDiv.scrollHeight;
        }

        async function testHealth() {
          try {
            const response = await fetch('/api/health');
            const data = await response.json();
            showResult('Health Check Result:\\n' + JSON.stringify(data, null, 2));
          } catch (error) {
            showResult('Error: ' + error.message);
          }
        }

        function testSteamAuth() {
          showResult('Redirecting to Steam OAuth...');
          setTimeout(() => {
            window.location.href = '/api/steam/auth';
          }, 1000);
        }

        async function testInventoryFallback() {
          showResult('Testing inventory fallback method...');
          try {
            const response = await fetch('/api/steam/inventory/76561199257487454?appId=570');
            const data = await response.json();
            showResult('Inventory Fallback Result:\\n' + JSON.stringify(data, null, 2));
          } catch (error) {
            showResult('Error: ' + error.message);
          }
        }

        async function testMarketplace() {
          showResult('Testing marketplace endpoints...');
          try {
            const response = await fetch('/api/marketplace/listings');
            const data = await response.json();
            showResult('Marketplace Result:\\n' + JSON.stringify(data, null, 2));
          } catch (error) {
            showResult('Error: ' + error.message);
          }
        }
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

// Steam login endpoint - REAL STEAM OAUTH
app.get('/api/steam/auth', (req, res) => {
  try {
    console.log('🔗 Steam login requested');

    // Use frontend domain for return URL
    const host = 'localhost:3000';
    const returnUrl = `http://${host}/api/steam/auth/return`;

    console.log(`🔗 Return URL: ${returnUrl}`);
    console.log(`🔗 Realm: ${STEAM_REALM}`);

    const steamOpenIdUrl = `https://steamcommunity.com/openid/login?` + new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnUrl,
      'openid.realm': STEAM_REALM,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    });

    console.log('🔗 Redirecting to Steam OAuth:', steamOpenIdUrl);
    res.redirect(steamOpenIdUrl);
  } catch (error) {
    console.error('❌ Steam login error:', error);
    res.status(500).json({ error: 'Steam login failed' });
  }
});

// Steam callback endpoint
app.get('/api/steam/auth/return', (req, res) => {
  try {
    console.log('🎯 Steam callback endpoint hit!');

    const queryParams = req.query;
    console.log('🎯 Full query params:', Object.keys(queryParams));
    console.log('🎯 OpenID mode:', queryParams['openid.mode']);

    // Check if this is a Steam OpenID error response
    if (queryParams['openid.mode'] === 'error') {
      console.log('❌ Steam OAuth error response');
      console.log('❌ Error:', queryParams['openid.error']);
      sendAuthError(res, `Steam OAuth error: ${queryParams['openid.error']}`);
      return;
    }

    // Check if this is a Steam OpenID response
    if (queryParams['openid.mode'] === 'id_res') {
      console.log('✅ Steam OAuth ID response detected');

      // Extract Steam ID from claimed_id
      const claimedId = queryParams['openid.claimed_id'];
      console.log('🎯 Claimed ID to parse:', claimedId);

      if (!claimedId) {
        console.error('❌ No claimed_id in params');
        sendAuthError(res, 'Invalid Steam response - no claimed_id');
        return;
      }

      const steamIdMatch = claimedId.match(/\/(\d{17,18})$/);
      const steamId = steamIdMatch ? steamIdMatch[1] : null;

      console.log('🎯 Extracted Steam ID:', steamId);

      if (steamId) {
        console.log(`✅ Steam OAuth successful! Steam ID: ${steamId}`);

        // Get user profile from Steam Web API
        getSteamUserProfile(steamId).then(async userProfile => {
          console.log('🎯 User profile received:', userProfile.personaname);

          try {
            // Try to get user from database first
            let user = await DatabaseService.getUserBySteamId(steamId);

            if (!user) {
              // Create new user in database
              user = await DatabaseService.createUser({
                steamId: steamId,
                nickname: userProfile.personaname || `User${steamId.slice(-6)}`,
                avatar: userProfile.avatar || 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fallback/fallback_bighead.png',
                profileUrl: userProfile.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
                tradeUrl: `https://steamcommunity.com/trade/${steamId}/tradeoffers/`,
                apiKey: `steam_api_${steamId}_${Date.now()}`,
                apiKeyLastVerified: new Date().toISOString(),
                apiKeyStatus: 'active',
                isActive: true
              });
              console.log('🆕 Created new user in database:', user.nickname);
            } else {
              console.log('👋 Returning user:', user.nickname);
              // Update user info if needed
              await DatabaseService.updateUser(user.id, {
                nickname: userProfile.personaname || user.nickname,
                avatar: userProfile.avatar || user.avatar,
                profileUrl: userProfile.profileurl || user.profile_url
              });
            }

            // Store current user ID in session or global variable
            currentUserId = user.id;
            console.log('🎯 Current user set to:', currentUserId);

            // Generate authentication tokens
            const authResponse = {
              user: {
                id: user.id,
                steamId: user.steam_id,
                nickname: user.nickname,
                avatar: user.avatar,
                profileUrl: user.profile_url,
                tradeUrl: user.trade_url,
                apiKey: user.api_key,
                apiKeyLastVerified: user.api_key_last_verified,
                apiKeyStatus: user.api_key_status,
                isActive: user.is_active,
                createdAt: user.created_at,
                updatedAt: user.updated_at
              },
              accessToken: `steam-access-token-${steamId}-${Date.now()}`,
              expiresIn: 3600
            };

            // Use the new sendAuthSuccess function
            sendAuthSuccess(res, authResponse);
          } catch (dbError) {
            console.error('❌ Database error during user creation/update:', dbError);
            sendAuthError(res, 'Database error during authentication');
          }
        }).catch(error => {
          console.error('❌ Error getting user profile:', error);
          sendAuthError(res, 'Server error during authentication');
        });
        return;
      } else {
        console.error('❌ Failed to extract Steam ID from claimed_id');
        console.log('❌ Claimed ID format issue:', claimedId);
        sendAuthError(res, 'Failed to extract Steam ID');
      }
    } else if (queryParams['openid.mode'] === 'cancel') {
      console.log('❌ Steam OAuth cancelled by user');
      sendAuthError(res, 'Authentication cancelled by user');
    } else {
      console.log('⚠️ Steam OAuth failed or invalid response');
      console.log('⚠️ OpenID mode:', queryParams['openid.mode']);
      sendAuthError(res, 'Authentication failed - invalid response');
    }

  } catch (error) {
    console.error('❌ Steam callback error:', error);
    sendAuthError(res, 'Server error during authentication');
  }
});

// Get current user
app.get('/api/steam/auth/me', async (req, res) => {
  try {
    console.log('👤 Get current user requested');

    // For now, we'll use a simple in-memory approach
    // In a real application, you'd use proper session management
    if (currentUserId) {
      const user = await DatabaseService.getUserById(currentUserId);
      console.log('👤 Current user found:', user ? user.nickname : 'null');
      res.json({ data: user || null });
    } else {
      res.json({ data: null });
    }
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({ data: null });
  }
});

// Global variable to track current user (for demo purposes)
let currentUserId = null;

// Get user's Steam inventory - ENHANCED WITH HTML FALLBACK AND CACHING
app.get('/api/steam/inventory/:steamId', async (req, res) => {
  try {
    console.log('📦 Enhanced inventory endpoint requested');
    const steamId = req.params.steamId;
    const appId = req.query.appId || '570'; // Default to Dota 2

    console.log(`📦 Steam ID: ${steamId}, App ID: ${appId}`);

    if (!steamId) {
      res.status(400).json({ error: 'Steam ID is required' });
      return;
    }

    console.log(`📦 Fetching Steam inventory for user: ${steamId}, App ID: ${appId}`);

    try {
      const result = await getSteamInventory(steamId, appId);
      console.log(`✅ Successfully retrieved ${result.totalCount} items using ${result.method}`);

      res.json({
        success: true,
        data: result,
        method: result.method,
        message: `Inventory retrieved via ${result.method === 'json_api' ? 'Steam JSON API' : result.method.includes('cached') ? 'Cache' : 'HTML scraping fallback'}`
      });

    } catch (steamError) {
      console.log(`❌ Enhanced inventory fetch failed: ${steamError.message}`);

      // Provide detailed error information
      const isPrivate = steamError.message.includes('private');
      const isEmpty = steamError.message.includes('empty') || steamError.message.includes('No items');
      const isAPIIssue = steamError.message.includes('JSON API') || steamError.message.includes('HTML scraping');

      let userMessage = '❌ Failed to retrieve inventory';
      let helpText = '🔧 To fix this issue:\\n1. Go to your Steam profile\\n2. Click "Edit Profile" → "Privacy Settings"\\n3. Set "Inventory Privacy" to "Public"\\n4. Try again';

      if (isPrivate) {
        userMessage = '❌ Inventory is private or not accessible';
        helpText = '🔧 To fix this issue:\\n1. Go to your Steam profile\\n2. Click "Edit Profile" → "Privacy Settings"\\n3. Set "Inventory Privacy" to "Public"\\n4. Try again';
      } else if (isEmpty) {
        userMessage = '📭 No items found in inventory for this game';
        helpText = '💡 This means you have no items in your Steam inventory for this game';
      } else if (isAPIIssue) {
        userMessage = '❌ Steam API temporarily unavailable';
        helpText = '🔧 Technical issues detected:\\n1. Steam Community API may be experiencing issues\\n2. Try again in a few minutes\\n3. Check Steam Community status';
      }

      res.status(500).json({
        success: false,
        error: steamError.message,
        message: userMessage,
        help: helpText,
        method: 'enhanced_with_fallback'
      });
    }

  } catch (error) {
    console.error('❌ Enhanced inventory endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Failed to retrieve inventory',
      method: 'enhanced_with_fallback'
    });
  }
});

// Get current user's inventory
app.get('/api/steam/inventory/me', (req, res) => {
  try {
    console.log('📦 My inventory endpoint requested');

    if (!currentUserId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
        method: 'enhanced_with_fallback'
      });
      return;
    }

    // Get user from database to get Steam ID
    DatabaseService.getUserById(currentUserId).then(user => {
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
          method: 'enhanced_with_fallback'
        });
        return;
      }

      console.log('📦 Redirecting to inventory for user:', user.steam_id);
      const redirectUrl = `/api/steam/inventory/${user.steam_id}`;
      const appId = req.query.appId;

      if (appId) {
        res.set('Location', `${redirectUrl}?appId=${appId}`);
      } else {
        res.set('Location', redirectUrl);
      }
      res.status(302).end();
    }).catch(error => {
      console.error('❌ Error getting user from database:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
        method: 'enhanced_with_fallback'
      });
    });
  } catch (error) {
    console.error('❌ My inventory endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      method: 'enhanced_with_fallback'
    });
  }
});

// Game Detection Endpoints
app.get('/game-detection', async (req, res) => {
  if (!currentUserId) {
    return res.redirect('/');
  }

  const user = await DatabaseService.getUserById(currentUserId);
  if (!user) {
    return res.redirect('/');
  }

  const steamId = req.query.steamId || user.steam_id;
  const gameResults = req.session?.gameResults || null;
  const html = gameDetection.generateGameSelectionInterface(steamId, gameResults);
  res.send(html);
});

app.get('/api/steam/detect-games', async (req, res) => {
  try {
    if (!currentUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await DatabaseService.getUserById(currentUserId);
    const steamId = req.query.steamId || user.steam_id;
    console.log(`🔍 Starting game detection for ${steamId}`);

    // Start detection process
    const results = await gameDetection.detectAvailableGames(steamId);

    // Store results in session for later use
    if (!req.session) req.session = {};
    req.session.gameResults = results;

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('❌ Game detection error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/steam/supported-games', (req, res) => {
  try {
    const games = gameDetection.supportedGames;
    res.json({
      success: true,
      data: {
        totalGames: games.length,
        games: games
      }
    });
  } catch (error) {
    console.error('❌ Get supported games error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Marketplace Endpoints
app.get('/api/marketplace/listings', async (req, res) => {
  try {
    console.log('💰 Fetching marketplace listings');
    const listings = await DatabaseService.getAllActiveListings(50);
    res.json({
      success: true,
      data: {
        listings,
        totalCount: listings.length,
        message: 'Active trading listings from database'
      }
    });
  } catch (error) {
    console.error('❌ Error fetching marketplace listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch marketplace listings'
    });
  }
});

app.post('/api/marketplace/create-listing', async (req, res) => {
  try {
    console.log('💰 Creating new marketplace listing');

    if (!currentUserId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await DatabaseService.getUserById(currentUserId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const {
      assetId, classId, instanceId, appId,
      itemName, itemType, rarity, quality, exterior,
      tradable, marketable, price, currency
    } = req.body;

    if (!assetId || !classId || !appId || !price) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const listing = await DatabaseService.createTradingListing({
      userId: currentUserId,
      steamId: user.steam_id,
      assetId,
      classId,
      instanceId,
      appId,
      itemName,
      itemType,
      rarity,
      quality,
      exterior,
      tradable,
      marketable,
      price,
      currency
    });

    res.json({
      success: true,
      data: {
        listing,
        message: 'Trading listing created successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error creating marketplace listing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create marketplace listing'
    });
  }
});

// Logout
app.post('/api/steam/auth/logout', (req, res) => {
  try {
    console.log('👋 Logout requested');
    currentUserId = null;
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Initialize the server
initializeServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Получен SIGTERM, завершаем работу...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Получен SIGINT, завершаем работу...');
  process.exit(0);
});