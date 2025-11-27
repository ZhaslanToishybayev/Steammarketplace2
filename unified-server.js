// UNIFIED SERVER - All functionality in one place on port 3000
const express = require('express');
const https = require('https');
const http = require('http');
const url = require('url');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
const STEAM_API_KEY = process.env.STEAM_API_KEY || 'YOUR_STEAM_API_KEY_HERE';
const STEAM_REALM = 'http://localhost:3000'; // Force localhost:3000 as requested by user

// Debug: Log environment variables
console.log('🔍 Environment Variables Debug:');
console.log('STEAM_REALM from env:', process.env.STEAM_REALM);
console.log('STEAM_REALM final value:', STEAM_REALM);
console.log('STEAM_RETURN_URL from env:', process.env.STEAM_RETURN_URL);

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
function getSteamInventory(steamId, appId = 730) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

    console.log(`📦 Calling Steam API: ${apiUrl}`);

    https.get(apiUrl, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          console.log(`📦 Steam API Response Status: ${res.statusCode}`);
          console.log(`📦 Response length: ${data.length} bytes`);

          // Add better JSON parsing with error handling
          let inventory;
          try {
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

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({
    status: 'healthy',
    service: 'unified-server',
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
      <title>Unified Steam Marketplace</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .nav { margin-bottom: 30px; }
        .nav a { margin-right: 20px; text-decoration: none; color: #007bff; }
        .nav a:hover { text-decoration: underline; }
        .status { padding: 20px; background: #f8f9fa; border-radius: 5px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Unified Steam Marketplace</h1>
        <div class="nav">
          <a href="/api/health">Health Check</a>
          <a href="/api/steam/auth">Steam Login</a>
          <a href="/api/steam/auth/me">Current User</a>
          <a href="/api/steam/inventory/me">My Inventory</a>
        </div>
        <div class="status">
          <h3>✅ Server Status</h3>
          <p><strong>Service:</strong> unified-server</p>
          <p><strong>Port:</strong> ${PORT}</p>
          <p><strong>Users Count:</strong> ${users.length}</p>
          <p><strong>Current User:</strong> ${currentUserId || 'None'}</p>
        </div>
        <div>
          <h3>🎯 Available Endpoints:</h3>
          <ul>
            <li><code>GET /api/health</code> - Health check</li>
            <li><code>GET /api/steam/auth</code> - Steam OAuth login</li>
            <li><code>GET /api/steam/auth/return</code> - Steam OAuth callback</li>
            <li><code>GET /api/steam/auth/me</code> - Get current user</li>
            <li><code>GET /api/steam/inventory/:steamId</code> - Get user's inventory</li>
            <li><code>GET /api/steam/inventory/me</code> - Get current user's inventory</li>
            <li><code>POST /api/steam/auth/logout</code> - Logout</li>
          </ul>
        </div>
      </div>
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
    console.log('🎯 Claimed ID:', queryParams['openid.claimed_id']);

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

          // Return success HTML with user data
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

                // Redirect opener window to main page
                if (window.opener && !window.opener.closed) {
                  window.opener.location.href = '${STEAM_REALM}/';
                }

                // Close the popup after a short delay
                setTimeout(function() {
                  window.close();
                }, 2000);
              </script>
            </head>
            <body>
              <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                <h2>✅ Authentication successful!</h2>
                <p>You will be redirected to the main page automatically.</p>
                <p>This window will close in 2 seconds.</p>
              </div>
            </body>
            </html>
          `;

          res.setHeader('Content-Type', 'text/html');
          res.status(200).send(responseHtml);
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
      console.log('⚠️ Full params:', queryParams);
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
    const appId = req.query.appId || '730';

    console.log(`📦 Steam ID: ${steamId}, App ID: ${appId}`);

    if (!steamId) {
      res.status(400).json({ error: 'Steam ID is required' });
      return;
    }

    console.log(`📦 Fetching Steam inventory for user: ${steamId}, App ID: ${appId}`);

    const result = await getSteamInventory(steamId, appId);
    console.log(`✅ Successfully retrieved ${result.totalCount} items from Steam inventory`);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Steam inventory error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: error.message.includes('private') || error.message.includes('empty')
        ? 'Inventory is private or empty. Please check your Steam privacy settings.'
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
  console.log(`🚀 UNIFIED SERVER запущен на порту ${PORT}`);
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
});

// Serve static files after all API routes
app.use(express.static(path.join(__dirname, 'apps/frontend/public')));
app.use(express.static(path.join(__dirname, 'apps/frontend/.next/static')));

// Catch-all route for Next.js (only for non-API routes)
app.get(/^(?!\/api\/)/, (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  // Try to serve Next.js built files first
  const nextHtmlPath = path.join(__dirname, 'apps/frontend/.next/server/app', req.path === '/' ? 'index' : req.path, 'index.html');

  if (req.path.startsWith('/_next/')) {
    // Serve Next.js assets
    const assetPath = path.join(__dirname, 'apps/frontend', req.path);
    if (require('fs').existsSync(assetPath)) {
      return res.sendFile(assetPath, { root: __dirname });
    }
    return res.status(404).send('Asset not found');
  }

  // For now, serve a simple HTML response with Steam OAuth integration
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Steam Marketplace</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .nav { margin-bottom: 30px; }
        .nav a { margin-right: 20px; text-decoration: none; color: #007bff; }
        .nav a:hover { text-decoration: underline; }
        .status { padding: 20px; background: #f8f9fa; border-radius: 5px; margin-bottom: 20px; }
        .steam-button { background: #1f2937; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
        .steam-button:hover { background: #111827; }
        .api-test { margin: 20px 0; padding: 15px; background: #e5e7eb; border-radius: 5px; }
        .response { background: #1f2937; color: #f9fafb; padding: 10px; margin: 10px 0; border-radius: 3px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Steam Marketplace - Unified Server</h1>
        <div class="nav">
          <a href="/api/health">Health Check</a>
          <a href="/api/steam/auth">Steam Login</a>
          <a href="/api/steam/auth/me">Current User</a>
          <a href="/api/steam/inventory/me">My Inventory</a>
        </div>

        <div class="status">
          <h3>✅ Server Status</h3>
          <p><strong>Service:</strong> unified-server</p>
          <p><strong>Port:</strong> ${PORT}</p>
          <p><strong>Users Count:</strong> ${users.length}</p>
          <p><strong>Current User:</strong> ${currentUserId || 'None'}</p>
        </div>

        <div class="steam-button-container">
          <a href="/api/steam/auth" class="steam-button">🔗 Login with Steam</a>
          <a href="/api/steam/auth/logout" class="steam-button">👋 Logout</a>
        </div>

        <div class="api-test">
          <h3>🧪 Quick API Tests</h3>
          <button onclick="testHealth()">Test Health</button>
          <button onclick="testCurrentUser()">Test Current User</button>
          <button onclick="testSteamInventory()">Test Steam Inventory</button>

          <div id="response" class="response" style="display: none;"></div>
        </div>

        <script>
          async function testHealth() {
            try {
              const response = await fetch('/api/health');
              const data = await response.json();
              document.getElementById('response').style.display = 'block';
              document.getElementById('response').innerHTML = 'Health Check: ' + JSON.stringify(data, null, 2);
            } catch (error) {
              document.getElementById('response').style.display = 'block';
              document.getElementById('response').innerHTML = 'Error: ' + error.message;
            }
          }

          async function testCurrentUser() {
            try {
              const response = await fetch('/api/steam/auth/me');
              const data = await response.json();
              document.getElementById('response').style.display = 'block';
              document.getElementById('response').innerHTML = 'Current User: ' + JSON.stringify(data, null, 2);
            } catch (error) {
              document.getElementById('response').style.display = 'block';
              document.getElementById('response').innerHTML = 'Error: ' + error.message;
            }
          }

          async function testSteamInventory() {
            try {
              const response = await fetch('/api/steam/inventory/me');
              const data = await response.json();
              document.getElementById('response').style.display = 'block';
              document.getElementById('response').innerHTML = 'Inventory: ' + JSON.stringify(data, null, 2);
            } catch (error) {
              document.getElementById('response').style.display = 'block';
              document.getElementById('response').innerHTML = 'Error: ' + error.message;
            }
          }
        </script>
      </div>
    </body>
    </html>
  `);
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