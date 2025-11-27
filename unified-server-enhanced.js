// UNIFIED SERVER - ENHANCED VERSION - Professional marketplace approach on port 3000
const express = require('express');
const https = require('https');
const http = require('http');
const url = require('url');
const path = require('path');

const app = express();
const PORT = 3000; // Force port 3000

// Import the enhanced Steam inventory system
const enhancedSteamInventory = require('./enhanced-steam-inventory');
const tradingRoutes = require('./trading-routes');

app.use(express.json());

// Mount trading routes
app.use('/', tradingRoutes);

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

// Health check with enhanced cache statistics
app.get('/api/health', (req, res) => {
  const cacheStats = enhancedSteamInventory.getCacheStats();
  console.log('🏥 Health check requested with cache stats:', cacheStats);

  res.json({
    status: 'healthy',
    service: 'unified-server-enhanced',
    timestamp: new Date().toISOString(),
    usersCount: users.length,
    currentUserId: currentUserId,
    cache: cacheStats,
    version: '2.0-enhanced'
  });
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

// ENHANCED Steam inventory endpoint with professional features
app.get('/api/steam/inventory/:steamId', async (req, res) => {
  try {
    console.log('📦 Enhanced inventory request started');
    const { steamId } = req.params;
    const { appId = '730', format = 'detailed' } = req.query;

    console.log(`📦 Enhanced inventory request: SteamID=${steamId}, AppID=${appId}, Format=${format}`);

    // Валидация Steam ID
    if (!steamId || !/^\d{17,18}$/.test(steamId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Steam ID format',
        message: 'Steam ID must be a 17-18 digit number'
      });
    }

    // Валидация App ID
    const validAppIds = ['730', '570', '440', '2561420']; // CS2, Dota 2, TF2, etc.
    if (!validAppIds.includes(appId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid App ID',
        message: `App ID must be one of: ${validAppIds.join(', ')}`,
        supportedApps: {
          '730': 'Counter-Strike 2',
          '570': 'Dota 2',
          '440': 'Team Fortress 2',
          '2561420': 'Counter-Strike: Global Offensive'
        }
      });
    }

    // Получаем инвентарь с профессиональным кэшированием и retry mechanism
    const result = await enhancedSteamInventory.fetchSteamInventory(steamId, appId);

    // Форматируем ответ в зависимости от запроса
    let responseData = result;

    if (format === 'simple') {
      // Простой формат - только основная информация
      responseData = {
        success: result.success,
        steamId: result.steamId,
        appId: result.appId,
        totalCount: result.totalCount,
        items: result.items.map(item => ({
          name: item.name,
          amount: item.amount,
          image: item.image,
          tradable: item.tradable,
          marketable: item.marketable,
          estimatedPrice: item.estimatedPrice
        }))
      };
    }

    // Добавляем метаданные как у профессиональных marketplace
    responseData.metadata = {
      requestTimestamp: new Date().toISOString(),
      cacheUsed: enhancedSteamInventory.getFromCache(`${steamId}_${appId}`) !== null,
      server: 'enhanced-steam-inventory',
      apiVersion: '2.0'
    };

    res.json(responseData);

  } catch (error) {
    console.error('❌ Enhanced inventory error:', error.message);

    // Professional error responses
    const errorResponses = {
      'Invalid Steam ID or request parameters': { status: 400, code: 'INVALID_STEAM_ID' },
      'Steam inventory is private': { status: 403, code: 'INVENTORY_PRIVATE' },
      'Steam user not found or inventory does not exist': { status: 404, code: 'USER_NOT_FOUND' },
      'Steam API request timeout': { status: 408, code: 'REQUEST_TIMEOUT' },
      'Steam server temporarily unavailable': { status: 503, code: 'SERVICE_UNAVAILABLE' }
    };

    const errorInfo = errorResponses[error.message] || { status: 500, code: 'INTERNAL_ERROR' };

    res.status(errorInfo.status).json({
      success: false,
      error: error.message,
      errorCode: errorInfo.code,
      message: getUserFriendlyMessage(error.message),
      help: getHelpInformation(error.message),
      timestamp: new Date().toISOString()
    });
  }
});

// Get current user's inventory (authenticated)
app.get('/api/steam/inventory/me', (req, res) => {
  try {
    console.log('📦 My inventory endpoint requested');
    const currentUser = users.find(u => u.id === currentUserId);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'Please log in to view your inventory'
      });
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
      error: 'Server error',
      message: 'Failed to retrieve your inventory'
    });
  }
});

// Cache management endpoints
app.delete('/api/steam/inventory/cache/:steamId', (req, res) => {
  try {
    const { steamId } = req.params;
    const { appId = '730' } = req.query;
    const cacheKey = `${steamId}_${appId}`;

    if (enhancedSteamInventory.cache.has(cacheKey)) {
      enhancedSteamInventory.cache.delete(cacheKey);
      console.log(`🧹 Cache cleared for Steam ID: ${steamId}`);
      res.json({
        success: true,
        message: `Cache cleared for Steam ID: ${steamId}`,
        cacheKey: cacheKey
      });
    } else {
      res.json({
        success: true,
        message: `No cached data found for Steam ID: ${steamId}`,
        cacheKey: cacheKey
      });
    }

  } catch (error) {
    console.error('❌ Cache clear error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to clear cache'
    });
  }
});

// Helper methods
function getUserFriendlyMessage(errorMessage) {
  const messages = {
    'Invalid Steam ID or request parameters': 'Please check your Steam ID and try again',
    'Steam inventory is private': 'This user\'s inventory is set to private. Please check Steam profile privacy settings',
    'Steam user not found or inventory does not exist': 'User not found or inventory does not exist',
    'Steam API request timeout': 'Steam servers are temporarily slow. Please try again in a few moments',
    'Steam server temporarily unavailable': 'Steam servers are temporarily unavailable. Please try again later'
  };

  return messages[errorMessage] || 'An unexpected error occurred. Please try again later';
}

function getHelpInformation(errorMessage) {
  const help = {
    'Steam inventory is private': [
      '1. Go to your Steam profile',
      '2. Click "Edit Profile" → "Privacy Settings"',
      '3. Set "Inventory Privacy" to "Public"',
      '4. Try again after 5 minutes'
    ],
    'Steam API request timeout': [
      '1. Steam servers might be experiencing high load',
      '2. Try again in a few moments',
      '3. If problem persists, check Steam status at https://steamstat.us'
    ]
  };

  return help[errorMessage] || [
    '1. Check your internet connection',
    '2. Verify your Steam ID is correct',
    '3. Try again in a few moments',
    '4. Contact support if problem persists'
  ];
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

// Root route with enhanced UI
app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Enhanced Steam Marketplace - Professional Edition</title>
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
          background: #3498db;
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
          background: #2980b9;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.4);
        }
        .steam-button:active {
          transform: translateY(0);
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
        .cache-stats {
          background: #2d2d2d;
          border-radius: 10px;
          padding: 15px;
          margin-top: 20px;
        }
        .cache-stats h4 {
          margin: 0 0 10px 0;
          color: #e67e22;
        }
        .cache-stats .stat {
          display: inline-block;
          margin-right: 20px;
          color: #2ecc71;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Enhanced Steam Marketplace - Professional Edition</h1>
          <p>Steam Authentication & Inventory System with Professional Features</p>
        </div>

        <div class="nav-buttons">
          ${currentUserId ? `
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
          <p><strong>Service:</strong> <span class="value">unified-server-enhanced</span></p>
          <p><strong>Port:</strong> <span class="value">${PORT}</span></p>
          <p><strong>Realm:</strong> <span class="value">${STEAM_REALM}</span></p>
          <p><strong>Users Count:</strong> <span class="value">${users.length}</span></p>
          <p><strong>Current User:</strong> <span class="value">${currentUserId || 'None'}</span></p>
        </div>

        <div class="api-section">
          <h3>🎯 Available Endpoints:</h3>
          <ul class="api-list">
            <li><code>GET /api/health</code> - Health check with cache statistics</li>
            <li><code>GET /api/steam/auth</code> - Steam OAuth login</li>
            <li><code>GET /api/steam/auth/return</code> - Steam OAuth callback</li>
            <li><code>GET /api/steam/auth/me</code> - Get current user</li>
            <li><code>GET /api/steam/inventory/:steamId</code> - Get user's inventory (enhanced)</li>
            <li><code>GET /api/steam/inventory/me</code> - Get current user's inventory</li>
            <li><code>DELETE /api/steam/inventory/cache/:steamId</code> - Clear cache</li>
            <li><code>POST /api/steam/auth/logout</code> - Logout</li>
          </ul>
        </div>

        <div class="cache-stats">
          <h4>💾 Cache Statistics</h4>
          <div id="cacheStats" class="stat">Loading...</div>
        </div>

        <div class="test-area">
          <h3>🧪 Quick API Tests:</h3>
          <div class="test-buttons">
            <button onclick="testHealth()" class="test-button">🏥 Test Health</button>
            <button onclick="testCurrentUser()" class="test-button">👤 Test Current User</button>
            <button onclick="testSteamAuth()" class="test-button">🔗 Test Steam Auth</button>
            <button onclick="testCacheStats()" class="test-button">💾 Test Cache</button>
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
            updateCacheStats(data.cache);
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

        async function testCacheStats() {
          try {
            await testHealth(); // This will also update cache stats
          } catch (error) {
            showResult('Error getting cache stats: ' + error.message);
          }
        }

        function updateCacheStats(cache) {
          if (cache) {
            const cacheStatsDiv = document.getElementById('cacheStats');
            cacheStatsDiv.innerHTML = 'Total: ' + cache.totalEntries + ' | Valid: ' + cache.validEntries + ' | Expired: ' + cache.expiredEntries + ' | Hit Rate: ' + cache.hitRate;
          }
        }

        // Auto-refresh cache stats every 10 seconds
        setInterval(testHealth, 10000);
        // Initial load
        testHealth();
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

// Inventory Demo Page - Beautiful UI for viewing demo inventory
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
          font-weight: bold;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
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
          color: #2ecc71;
          margin-bottom: 5px;
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

// Cache cleanup - как у профессиональных marketplace
setInterval(() => {
  enhancedSteamInventory.clearExpiredCache();
  console.log('🧹 Cleaned expired cache entries');
}, 10 * 60 * 1000); // Каждые 10 минут

// Start server
app.listen(PORT, () => {
  console.log(`🚀 UNIFIED SERVER ENHANCED запущен на порту ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎯 Все эндпоинты доступны:`);
  console.log(`   - http://localhost:${PORT}/api/steam/auth (login)`);
  console.log(`   - http://localhost:${PORT}/api/steam/auth/return (callback)`);
  console.log(`   - http://localhost:${PORT}/api/steam/auth/me (current user)`);
  console.log(`   - http://localhost:${PORT}/api/steam/inventory/me (my inventory)`);
  console.log(`   - http://localhost:${PORT}/api/steam/inventory/:steamId (enhanced inventory)`);
  console.log(`   - http://localhost:${PORT}/api/steam/auth/logout (logout)`);
  console.log(`🎯 РЕЖИМ ПОЛНОЙ ОТЛАДКИ ВКЛЮЧЕН`);
  console.log(`🎯 Все действия Steam OAuth будут показаны в логах`);
  console.log(`🎯 HARDCODED REALM: ${STEAM_REALM}`);
  console.log(`💾 Enhanced Steam Inventory System Active`);
  console.log(`🔄 Cache cleanup runs every 10 minutes`);
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