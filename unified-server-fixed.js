// UNIFIED SERVER - FIXED VERSION - All functionality in one place on port 3000
const express = require('express');
const https = require('https');
const http = require('http');
const url = require('url');
const path = require('path');

// Import Game Detection System
const GameDetectionSystem = require('./game-detection-system');

const app = express();
const PORT = 3000; // Force port 3000

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

// Steam API Configuration - REAL CREDENTIALS - HARDCODED TO AVOID ENV ISSUES
const STEAM_API_KEY = 'YOUR_STEAM_API_KEY_HERE';
const STEAM_REALM = 'http://localhost:3000'; // HARDCODED - Force localhost:3000

// Debug: Log environment variables
console.log('🔍 Environment Variables Debug:');
console.log('STEAM_REALM hardcoded to:', STEAM_REALM);
console.log('STEAM_REALM from env:', process.env.STEAM_REALM);

// Mock user database
let users = [
  {
    id: '1',
    steamId: '76561198012345678',
    nickname: 'TestUser',
    avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fake.jpg',
    profileUrl: 'https://steamcommunity.com/profiles/76561198012345678',
    tradeUrl: 'https://steamcommunity.com/trade/123456789/tradeoffers/',
    apiKey: 'mock_api_key_12345',
    apiKeyLastVerified: new Date().toISOString(),
    apiKeyStatus: 'active',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      totalTrades: 15,
      successfulTrades: 12,
      cancelledTrades: 3,
      totalSpent: 250.50,
      totalEarned: 320.00,
      itemsListed: 8,
      itemsSold: 5
    }
  }
];

// Current authenticated user (for demo)
let currentUserId = null;

// Helper function to get Steam Inventory from Steam Community API
function getSteamInventory(steamId, appId = 570) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

    console.log(`📦 Calling Steam API: ${apiUrl}`);

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

      // Handle gzip compression
      const contentEncoding = res.headers['content-encoding'];
      let stream = res;

      if (contentEncoding && contentEncoding.includes('gzip')) {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
        console.log('📦 Stream is gzipped, decompressing...');
      } else if (contentEncoding && contentEncoding.includes('deflate')) {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createInflate());
        console.log('📦 Stream is deflated, decompressing...');
      }

      stream.on('data', (chunk) => {
        data += chunk;
      });

      stream.on('end', () => {
        try {
          console.log(`📦 Steam API Response Status: ${res.statusCode}`);
          console.log(`📦 Response length: ${data.length} bytes`);

          // Check for common error responses
          if (res.statusCode !== 200) {
            if (res.statusCode === 400) {
              reject(new Error('Invalid Steam ID or inventory not accessible'));
              return;
            } else if (res.statusCode === 403 || res.statusCode === 401) {
              reject(new Error('Inventory is private or not accessible'));
              return;
            } else if (res.statusCode === 404) {
              reject(new Error('User not found or inventory does not exist'));
              return;
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
              return;
            }
          }

          // Add better JSON parsing with error handling
          let inventory;
          try {
            // Handle case where Steam API returns null (private/empty inventory)
            if (data.trim() === 'null') {
              reject(new Error('Inventory is private or empty'));
              return;
            }

            inventory = JSON.parse(data);
          } catch (parseError) {
            console.error('❌ Failed to parse Steam inventory JSON:', parseError.message);
            console.log('📦 Raw response data (first 500 chars):', data.substring(0, 500));
            reject(new Error('Steam API returned invalid JSON response'));
            return;
          }

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
              image: description?.icon_url ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url}/62fx62f` : '',
              imageLarge: description?.icon_url_large ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url_large}/184fx184f` : '',
              tradable: description?.tradable === 1,
              marketable: description?.marketable === 1,
              marketHashName: description?.market_hash_name || '',
              description: description?.descriptions?.[0]?.value || '',
              appId: appId,
              price: Math.random() * 100 + 1
            };
          });

          resolve({
            success: true,
            steamId,
            appId,
            items,
            totalCount: items.length
          });

        } catch (error) {
          console.error('❌ Failed to process Steam inventory data:', error.message);
          console.log('📦 Raw response data (first 500 chars):', data.substring(0, 500));
          reject(new Error('Failed to process inventory data'));
        }
      });

      stream.on('error', (error) => {
        console.error('❌ Stream decompression error:', error);
        reject(new Error('Failed to decompress Steam API response'));
      });

    }).on('error', (error) => {
      console.error('❌ Steam API request error:', error);
      reject(error);
    });
  });
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

// Helper function to send successful authentication response with redirect
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
    service: 'unified-server-fixed',
    timestamp: new Date().toISOString(),
    usersCount: users.length,
    currentUserId: currentUserId
  });
});

// Root route
app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Unified Steam Marketplace - FIXED</title>
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
          border: 1px solid #444;
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Unified Steam Marketplace - FIXED VERSION</h1>
          <p>Steam Authentication System Working on Port 3000</p>
        </div>

        <div class="nav-buttons">
          ${currentUserId ? `
            <a href="/game-detection" class="steam-button">
              🔍 <strong>Find My Games</strong>
            </a>
            <a href="/inventory" class="steam-button">
              📦 <strong>View My Inventory</strong>
            </a>
            <a href="/api/steam/auth/logout" class="steam-button">
              👋 <strong>Logout</strong>
            </a>
          ` : `
            <a href="/api/steam/auth" class="steam-button">
              🔗 <strong>Login with Steam</strong>
            </a>
            <a href="/inventory-demo" class="steam-button" style="background: #27ae60;">
              🎮 <strong>View Demo Inventory</strong>
            </a>
          `}
          <a href="/api/steam/auth/me" class="steam-button">
            👤 <strong>Check User Status</strong>
          </a>
          <a href="/api/health" class="steam-button">
            🏥 <strong>Health Check</strong>
          </a>
        </div>

        <div class="status">
          <h3>✅ Server Status</h3>
          <p><strong>Service:</strong> <span class="value">unified-server-fixed</span></p>
          <p><strong>Port:</strong> <span class="value">${PORT}</span></p>
          <p><strong>Realm:</strong> <span class="value">${STEAM_REALM}</span></p>
          <p><strong>Users Count:</strong> <span class="value">${users.length}</span></p>
          <p><strong>Current User:</strong> <span class="value">${currentUserId || 'None'}</span></p>
        </div>

        <div class="api-section">
          <h3>🎯 Available Endpoints:</h3>
          <ul class="api-list">
            <li><code>GET /api/health</code> - Health check</li>
            <li><code>GET /api/steam/auth</code> - Steam OAuth login</li>
            <li><code>GET /api/steam/auth/return</code> - Steam OAuth callback</li>
            <li><code>GET /api/steam/auth/me</code> - Get current user</li>
            <li><code>GET /api/steam/inventory/:steamId</code> - Get user's inventory</li>
            <li><code>GET /api/steam/inventory/me</code> - Get current user's inventory</li>
            <li><code>POST /api/steam/auth/logout</code> - Logout</li>
          </ul>
        </div>

        <div class="test-area">
          <h3>🧪 Quick API Tests:</h3>
          <div class="test-buttons">
            <button onclick="testHealth()" class="test-button">🏥 Test Health</button>
            <button onclick="testCurrentUser()" class="test-button">👤 Test Current User</button>
            <button onclick="testSteamAuth()" class="test-button">🔗 Test Steam Auth</button>
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

        async function testCurrentUser() {
          try {
            const response = await fetch('/api/steam/auth/me');
            const data = await response.json();
            showResult('Current User Result:\\n' + JSON.stringify(data, null, 2));
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
        getSteamUserProfile(steamId).then(userProfile => {
          console.log('🎯 User profile received:', userProfile.personaname);

          // Create or update user in database
          let user = users.find(u => u.steamId === steamId);
          if (!user) {
            user = {
              id: (users.length + 1).toString(),
              steamId: steamId,
              nickname: userProfile.personaname || `User${steamId.slice(-6)}`,
              avatar: userProfile.avatar || 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fallback/fallback_bighead.png',
              profileUrl: userProfile.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
              tradeUrl: `https://steamcommunity.com/trade/${steamId}/tradeoffers/`,
              apiKey: `steam_api_${steamId}_${Date.now()}`,
              apiKeyLastVerified: new Date().toISOString(),
              apiKeyStatus: 'active',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              stats: {
                totalTrades: 0,
                successfulTrades: 0,
                cancelledTrades: 0,
                totalSpent: 0,
                totalEarned: 0,
                itemsListed: 0,
                itemsSold: 0
              }
            };
            users.push(user);
            console.log('🆕 Created new user:', user.nickname);
          } else {
            console.log('👋 Returning user:', user.nickname);
          }

          // Set current user
          currentUserId = user.id;
          console.log('🎯 Current user set to:', currentUserId);

          // Generate authentication tokens
          const authResponse = {
            user: {
              id: user.id,
              steamId: user.steamId,
              nickname: user.nickname,
              avatar: user.avatar,
              profileUrl: user.profileUrl,
              tradeUrl: user.tradeUrl,
              apiKey: user.apiKey,
              apiKeyLastVerified: user.apiKeyLastVerified,
              apiKeyStatus: user.apiKeyStatus,
              isActive: user.isActive,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              stats: user.stats
            },
            accessToken: `steam-access-token-${steamId}-${Date.now()}`,
            expiresIn: 3600
          };

          // Use the new sendAuthSuccess function
          sendAuthSuccess(res, authResponse);
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
app.get('/api/steam/auth/me', (req, res) => {
  try {
    console.log('👤 Get current user requested');
    const user = users.find(u => u.id === currentUserId);
    console.log('👤 Current user found:', user ? user.nickname : 'null');
    res.json({ data: user || null });
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({ data: null });
  }
});

// Get user's Steam inventory - REAL INVENTORY API
app.get('/api/steam/inventory/:steamId', async (req, res) => {
  try {
    console.log('📦 Inventory endpoint requested');

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
      console.log(`✅ Successfully retrieved ${result.totalCount} items from Steam inventory`);

      res.json({
        success: true,
        data: result
      });

    } catch (steamError) {
      console.log(`❌ Steam API failed: ${steamError.message}`);

      // Return real error to user so they can fix Steam privacy settings
      res.status(500).json({
        success: false,
        error: steamError.message,
        message: steamError.message.includes('private') || steamError.message.includes('empty') || steamError.message.includes('Invalid Steam ID')
          ? '❌ Inventory is private, empty, or not accessible. Please check your Steam privacy settings and make sure your inventory is public.'
          : '❌ Failed to retrieve inventory from Steam',
        help: '🔧 To fix this issue:\n1. Go to your Steam profile\n2. Click "Edit Profile" → "Privacy Settings"\n3. Set "Inventory Privacy" to "Public"\n4. Try again'
      });
    }

  } catch (error) {
    console.error('❌ Steam inventory error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: error.message.includes('private') || error.message.includes('empty') || error.message.includes('Invalid Steam ID')
        ? 'Inventory is private, empty, or not accessible. Please check your Steam privacy settings.'
        : 'Failed to retrieve inventory'
    });
  }
});

// Get current user's inventory
app.get('/api/steam/inventory/me', (req, res) => {
  try {
    console.log('📦 My inventory endpoint requested');
    const currentUser = users.find(u => u.id === currentUserId);
    if (!currentUser) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    console.log('📦 Redirecting to inventory for user:', currentUser.steamId);
    const redirectUrl = `/api/steam/inventory/${currentUser.steamId}`;
    const appId = req.query.appId;

    if (appId) {
      res.set('Location', `${redirectUrl}?appId=${appId}`);
    } else {
      res.set('Location', redirectUrl);
    }
    res.status(302).end();
  } catch (error) {
    console.error('❌ My inventory endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Game Detection Endpoints

// Get game detection interface
app.get('/game-detection', async (req, res) => {
  const currentUser = users.find(u => u.id === currentUserId);
  if (!currentUser) {
    return res.redirect('/');
  }

  const steamId = req.query.steamId || currentUser.steamId;
  const gameResults = req.session?.gameResults || null;

  const html = gameDetection.generateGameSelectionInterface(steamId, gameResults);
  res.send(html);
});

// Start game detection process
app.get('/api/steam/detect-games', async (req, res) => {
  try {
    const currentUser = users.find(u => u.id === currentUserId);
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const steamId = req.query.steamId || currentUser.steamId;
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get supported games list
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Steam Inventory Page - Beautiful UI for viewing user's Steam inventory
app.get('/inventory', async (req, res) => {
  const currentUser = users.find(u => u.id === currentUserId);
  if (!currentUser) {
    return res.redirect('/');
  }

  const steamId = req.query.steamId || currentUser.steamId;
  const appId = req.query.appId || '570'; // Default to Dota 2

  try {
    const inventoryResult = await getSteamInventory(steamId, appId);

    const inventoryHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Steam Inventory - ${currentUser.nickname}</title>
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
          .user-info {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
          }
          .user-avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 2px solid #3498db;
          }
          .user-details h2 {
            color: #3498db;
            margin: 0;
          }
          .user-details p {
            margin: 5px 0;
            color: #b0b0b0;
          }
          .nav-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-bottom: 30px;
            flex-wrap: wrap;
          }
          .nav-button {
            background: #3498db;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            transition: all 0.3s ease;
          }
          .nav-button:hover {
            background: #2980b9;
            transform: translateY(-2px);
          }
          .inventory-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 15px;
          }
          .inventory-item {
            background: #2d2d2d;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 15px;
            transition: all 0.3s ease;
          }
          .inventory-item:hover {
            border-color: #3498db;
            transform: translateY(-2px);
          }
          .item-image {
            width: 100%;
            height: 120px;
            object-fit: cover;
            border-radius: 6px;
            margin-bottom: 10px;
          }
          .item-name {
            font-weight: bold;
            color: #3498db;
            margin-bottom: 5px;
          }
          .item-type {
            color: #b0b0b0;
            font-size: 12px;
            margin-bottom: 5px;
          }
          .item-details {
            font-size: 12px;
            color: #d0d0d0;
          }
          .item-price {
            font-weight: bold;
            color: #2ecc71;
            margin-top: 10px;
          }
          .empty-inventory {
            text-align: center;
            padding: 50px;
            color: #b0b0b0;
          }
          .stats {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          .stat-card {
            background: #3d3d3d;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #555;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #3498db;
          }
          .stat-label {
            color: #b0b0b0;
            font-size: 12px;
          }
          .inventory-error {
            background: #dc3545;
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
          }
          .error-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 20px;
            flex-wrap: wrap;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Steam Inventory Viewer</h1>
            <div class="user-info">
              <img src="${currentUser.avatar}" alt="Avatar" class="user-avatar">
              <div class="user-details">
                <h2>${currentUser.nickname}</h2>
                <p>Steam ID: ${steamId}</p>
                <p>Game: ${appId === '570' ? 'Dota 2' : appId === '730' ? 'Counter-Strike 2' : `Unknown Game (${appId})`}</p>
              </div>
            </div>
          </div>

          <div class="nav-buttons">
            <a href="/" class="nav-button">🏠 Home</a>
            <a href="/api/steam/auth/logout" class="nav-button">👋 Logout</a>
            <a href="/inventory?steamId=${steamId}&appId=570" class="nav-button"> Dota 2</a>
            <a href="/inventory?steamId=${steamId}&appId=730" class="nav-button"> CS2</a>
          </div>

          ${inventoryResult.items && inventoryResult.items.length > 0 ? `
            <div class="stats">
              <h3>📊 Inventory Statistics</h3>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value">${inventoryResult.totalCount || inventoryResult.items.length}</div>
                  <div class="stat-label">Total Items</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${inventoryResult.items.filter(item => item.tradable).length}</div>
                  <div class="stat-label"> Tradable</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${inventoryResult.items.filter(item => item.marketable).length}</div>
                  <div class="stat-label"> Marketable</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${inventoryResult.items.filter(item => item.rarity).length}</div>
                  <div class="stat-label"> Items with Rarity</div>
                </div>
              </div>
            </div>

            <div class="inventory-grid">
              ${inventoryResult.items.map(item => `
                <div class="inventory-item">
                  ${item.image ? `<img src="${item.image}" alt="${item.name}" class="item-image">` :
                    `<div style="height: 120px; background: #3d3d3d; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">No Image</div>`}
                  <div class="item-name">${item.name || 'Unknown Item'}</div>
                  <div class="item-type">${item.type || 'Unknown Type'}</div>
                  ${item.rarity ? `<div class="item-details"><strong>Rarity:</strong> ${item.rarity}</div>` : ''}
                  ${item.quality ? `<div class="item-details"><strong>Quality:</strong> ${item.quality}</div>` : ''}
                  ${item.exterior ? `<div class="item-details"><strong>Exterior:</strong> ${item.exterior}</div>` : ''}
                  <div class="item-details">${item.tradable ? '✅ Tradable' : '❌ Not Tradable'}</div>
                  <div class="item-details">${item.marketable ? '💰 Marketable' : '❌ Not Marketable'}</div>
                  <div class="item-price">$${(item.price || 0).toFixed(2)}</div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="inventory-error">
              <h3>📦 Unable to Load Inventory</h3>
              <p>Your Steam inventory could not be loaded. This might be due to:</p>
              <ul style="text-align: left; max-width: 400px; margin: 15px auto;">
                <li>Private Steam profile/inventory</li>
                <li>No items in your inventory for this game</li>
                <li>Steam Community API temporarily unavailable</li>
                <li>Network connectivity issues</li>
              </ul>
              <div class="error-actions">
                <a href="/inventory?steamId=${steamId}&appId=570" class="nav-button">Try Dota 2 Items</a>
                <a href="/inventory?steamId=${steamId}&appId=730" class="nav-button">Try CS2 Items</a>
                <a href="https://steamcommunity.com/my/inventory" target="_blank" class="nav-button">Check Steam Inventory</a>
              </div>
            </div>
          `}
        </div>

        <script>
          // Auto-refresh inventory every 5 minutes
          setTimeout(() => {
            window.location.reload();
          }, 300000);
        </script>
      </body>
      </html>
    `;

    res.send(inventoryHtml);
  } catch (error) {
    console.error('❌ Inventory page error:', error.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: #fff; }
          .container { max-width: 600px; margin: 0 auto; }
          .error { color: #e74c3c; }
          .nav-button { background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px; }
          .error-actions { margin: 30px 0; }
          .steam-help {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">❌ Failed to Load Inventory</h1>
          <p>${error.message}</p>

          <div class="error-actions">
            <a href="/" class="nav-button">🏠 Go Home</a>
            <a href="/inventory" class="nav-button">🔄 Try Again</a>
          </div>

          <div class="steam-help">
            <h3>🔧 Troubleshooting Steps:</h3>
            <ol>
              <li><strong>Check Steam Profile Privacy:</strong> Make sure your Steam profile and inventory are set to public</li>
              <li><strong>Verify Game Items:</strong> Ensure you have items in your Steam inventory for the selected game</li>
              <li><strong>Steam Community Status:</strong> Check if Steam Community is online and accessible</li>
              <li><strong>Network Connection:</strong> Verify your internet connection is working</li>
            </ol>

            <h4>Quick Links:</h4>
            <a href="https://steamcommunity.com/my/edit/settings/" target="_blank" class="nav-button">Edit Steam Privacy</a>
            <a href="https://steamcommunity.com/my/inventory" target="_blank" class="nav-button">View Steam Inventory</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

// Steam Inventory Demo Page - Beautiful UI for viewing demo inventory
app.get('/inventory-demo', (req, res) => {
  const steamId = req.query.steamId || '76561198012345678';
  const appId = req.query.appId || '730';

  // Create demo inventory data
  const demoInventory = {
    success: true,
    steamId: steamId,
    appId: appId,
    items: [
      {
        assetId: 'demo_asset_1',
        classId: 'demo_class_1',
        instanceId: 'demo_instance_1',
        amount: 1,
        name: 'AK-47 | Redline (Field-Tested)',
        type: 'Rifle',
        rarity: 'Covert',
        quality: 'Factory New',
        exterior: 'Field-Tested',
        image: 'https://steamcommunity-a.akamaihd.net/economy/image/fgx-9SfMKq5CTpJfE5u6Bw/62fx62f',
        imageLarge: 'https://steamcommunity-a.akamaihd.net/economy/image/fgx-9SfMKq5CTpJfE5u6Bw/184fx184f',
        tradable: true,
        marketable: true,
        marketHashName: 'AK-47%20Redline%20Field-Tested',
        description: 'A very popular and reliable assault rifle.',
        appId: appId,
        price: 245.50
      },
      {
        assetId: 'demo_asset_2',
        classId: 'demo_class_2',
        instanceId: 'demo_instance_2',
        amount: 1,
        name: 'M4A1-S | Blood Tiger (Factory New)',
        type: 'Rifle',
        rarity: 'Classified',
        quality: 'Factory New',
        exterior: 'Factory New',
        image: 'https://steamcommunity-a.akamaihd.net/economy/image/fgx-9SfMKq5CTpJfE5u6Bw/62fx62f',
        imageLarge: 'https://steamcommunity-a.akamaihd.net/economy/image/fgx-9SfMKq5CTpJfE5u6Bw/184fx184f',
        tradable: true,
        marketable: true,
        marketHashName: 'M4A1-S%20Blood%20Tiger%20Factory%20New',
        description: 'A premium M4 variant with a fierce design.',
        appId: appId,
        price: 389.99
      },
      {
        assetId: 'demo_asset_3',
        classId: 'demo_class_3',
        instanceId: 'demo_instance_3',
        amount: 2,
        name: 'Desert Eagle | Hypnotic (Minimal Wear)',
        type: 'Pistol',
        rarity: 'Restricted',
        quality: 'Factory New',
        exterior: 'Minimal Wear',
        image: 'https://steamcommunity-a.akamaihd.net/economy/image/fgx-9SfMKq5CTpJfE5u6Bw/62fx62f',
        imageLarge: 'https://steamcommunity-a.akamaihd.net/economy/image/fgx-9SfMKq5CTpJfE5u6Bw/184fx184f',
        tradable: true,
        marketable: false,
        marketHashName: 'Desert%20Eagle%20Hypnotic%20Minimal%20Wear',
        description: 'A powerful pistol with hypnotic pattern.',
        appId: appId,
        price: 156.75
      },
      {
        assetId: 'demo_asset_4',
        classId: 'demo_class_4',
        instanceId: 'demo_instance_4',
        amount: 1,
        name: 'AWP | Dragon Lore (Battle-Scarred)',
        type: 'Sniper Rifle',
        rarity: 'Covert',
        quality: 'Factory New',
        exterior: 'Battle-Scarred',
        image: 'https://steamcommunity-a.akamaihd.net/economy/image/fgx-9SfMKq5CTpJfE5u6Bw/62fx62f',
        imageLarge: 'https://steamcommunity-a.akamaihd.net/economy/image/fgx-9SfMKq5CTpJfE5u6Bw/184fx184f',
        tradable: true,
        marketable: true,
        marketHashName: 'AWP%20Dragon%20Lore%20Battle-Scarred',
        description: 'Iconic and highly sought-after sniper rifle skin.',
        appId: appId,
        price: 1250.00
      },
      {
        assetId: 'demo_asset_5',
        classId: 'demo_class_5',
        instanceId: 'demo_instance_5',
        amount: 3,
        name: 'Glock-18 | Fade (Factory New)',
        type: 'Pistol',
        rarity: 'Rare',
        quality: 'Factory New',
        exterior: 'Factory New',
        image: 'https://steamcommunity-a.akamaihd.net/economy/image/fgx-9SfMKq5CTpJfE5u6Bw/62fx62f',
        imageLarge: 'https://steamcommunity-a.akamaihd.net/economy/image/fgx-9SfMKq5CTpJfE5u6Bw/184fx184f',
        tradable: true,
        marketable: false,
        marketHashName: 'Glock-18%20Fade%20Factory%20New',
        description: 'Beautiful fade pattern on Glock-18.',
        appId: appId,
        price: 89.99
      }
    ],
    totalCount: 5
  };

  const inventoryHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Demo Steam Inventory - CS2 Skins</title>
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
        .nav-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        .nav-button {
          background: #3498db;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 6px;
          transition: all 0.3s ease;
        }
        .nav-button:hover {
          background: #2980b9;
          transform: translateY(-2px);
        }
        .stats {
          background: #2d2d2d;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 30px;
          text-align: center;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .stat-card {
          background: #3d3d3d;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #555;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #3498db;
        }
        .stat-label {
          color: #b0b0b0;
          font-size: 12px;
        }
        .inventory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 15px;
        }
        .inventory-item {
          background: #2d2d2d;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 15px;
          transition: all 0.3s ease;
        }
        .inventory-item:hover {
          border-color: #3498db;
          transform: translateY(-2px);
        }
        .item-image {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 6px;
          margin-bottom: 10px;
          background: #3d3d3d;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 14px;
        }
        .item-name {
          font-weight: bold;
          color: #3498db;
          margin-bottom: 5px;
        }
        .item-type {
          color: #b0b0b0;
          font-size: 12px;
          margin-bottom: 5px;
        }
        .item-details {
          font-size: 12px;
          color: #d0d0d0;
          margin-bottom: 5px;
        }
        .item-price {
          font-weight: bold;
          color: #2ecc71;
          margin-top: 10px;
        }
        .demo-badge {
          background: #27ae60;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎮 Demo Steam Inventory</h1>
          <p>CS2 Skins Showcase - Realistic Mock Data</p>
        </div>

        <div class="nav-buttons">
          <a href="/" class="nav-button">🏠 Home</a>
          <a href="/api/steam/auth" class="nav-button">🔗 Login with Steam</a>
          <a href="/api/steam/inventory/76561198012345678?appId=730" class="nav-button">📊 API Response</a>
        </div>

        <div class="stats">
          <h3>📊 Demo Inventory Statistics</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${demoInventory.totalCount}</div>
              <div class="stat-label">Total Items</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${demoInventory.items.filter(item => item.tradable).length}</div>
              <div class="stat-label">Tradable</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${demoInventory.items.filter(item => item.marketable).length}</div>
              <div class="stat-label">Marketable</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${demoInventory.items.filter(item => item.rarity).length}</div>
              <div class="stat-label">Items with Rarity</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">$${demoInventory.items.reduce((total, item) => total + (item.price || 0), 0).toFixed(2)}</div>
              <div class="stat-label">Total Value</div>
            </div>
          </div>
        </div>

        <div class="inventory-grid">
          ${demoInventory.items.map(item => `
            <div class="inventory-item">
              <div class="demo-badge">DEMO ITEM</div>
              <div class="item-image">CS2 Skin Image</div>
              <div class="item-name">${item.name}</div>
              <div class="item-type">${item.type}</div>
              ${item.rarity ? `<div class="item-details"><strong>Rarity:</strong> ${item.rarity}</div>` : ''}
              ${item.quality ? `<div class="item-details"><strong>Quality:</strong> ${item.quality}</div>` : ''}
              ${item.exterior ? `<div class="item-details"><strong>Exterior:</strong> ${item.exterior}</div>` : ''}
              <div class="item-details">${item.tradable ? '✅ Tradable' : '❌ Not Tradable'}</div>
              <div class="item-details">${item.marketable ? '💰 Marketable' : '❌ Not Marketable'}</div>
              <div class="item-price">$${(item.price || 0).toFixed(2)}</div>
            </div>
          `).join('')}
        </div>

        <div style="text-align: center; margin-top: 30px; padding: 20px; background: #2d2d2d; border-radius: 10px;">
          <h3>🎮 About This Demo</h3>
          <p>This is a demonstration of the Steam inventory system. The items shown are realistic CS2 skin examples with:</p>
          <ul style="text-align: left; max-width: 400px; margin: 15px auto;">
            <li>Realistic skin names and values</li>
            <li>Complete item data (rarity, quality, exterior)</li>
            <li>Tradable and marketable status</li>
            <li>Professional UI with statistics</li>
          </ul>
          <p><strong>Try the real system:</strong> Click "Login with Steam" to see your actual inventory!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  res.send(inventoryHtml);
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 UNIFIED SERVER FIXED запущен на порту ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎯 Все эндпоинты доступны:`);
  console.log(`   - http://localhost:${PORT}/api/steam/auth (login)`);
  console.log(`   - http://localhost:${PORT}/api/steam/auth/return (callback)`);
  console.log(`   - http://localhost:${PORT}/api/steam/auth/me (current user)`);
  console.log(`   - http://localhost:${PORT}/api/steam/inventory/me (my inventory)`);
  console.log(`   - http://localhost:${PORT}/api/steam/inventory/:steamId (user inventory)`);
  console.log(`   - http://localhost:${PORT}/api/steam/auth/logout (logout)`);
  console.log(`🎯 РЕЖИМ ПОЛНОЙ ОТЛАДКИ ВКЛЮЧЕН`);
  console.log(`🎯 Все действия Steam OAuth будут показаны в логах`);
  console.log(`🎯 HARDCODED REALM: ${STEAM_REALM}`);
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