// FINAL Steam Inventory API Integration - FULL DEBUG
const https = require('https');
const http = require('http');
const url = require('url');

// Steam API Configuration - REAL CREDENTIALS
const STEAM_API_KEY = process.env.STEAM_API_KEY || 'YOUR_STEAM_API_KEY_HERE';
const STEAM_REALM = process.env.STEAM_REALM || 'http://localhost:3000';
const STEAM_RETURN_URL = process.env.STEAM_RETURN_URL || 'http://localhost:3000/auth';

// Bot Configuration
const STEAM_BOT_USERNAME = process.env.STEAM_BOT_1_USERNAME || 'Sgovt1';
const STEAM_BOT_PASSWORD = process.env.STEAM_BOT_1_PASSWORD || 'Szxc123!';

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
          console.error('❌ Failed to parse Steam inventory data:', error.message);
          console.log('📦 Raw response data (first 500 chars):', data.substring(0, 500));
          reject(new Error('Failed to parse inventory data'));
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
        window.opener.postMessage({
          type: 'STEAM_AUTH_ERROR',
          data: { error: '${errorMessage}' }
        }, '${STEAM_REALM}');
        window.close();
      </script>
    </head>
    <body>
      <p>❌ ${errorMessage}. This window will close automatically.</p>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.writeHead(401);
  res.end(responseHtml);
}

// Route handlers
const routes = {
  // Health check
  '/health': (req, res) => {
    console.log('🏥 Health check requested');
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'steam-inventory-service-final',
      timestamp: new Date().toISOString(),
      usersCount: users.length,
      currentUserId: currentUserId
    }));
  },

  // Steam login endpoint - REAL STEAM OAUTH
  '/auth/steam': (req, res) => {
    try {
      console.log('🔗 Steam login requested');

      const parsedUrl = url.parse(req.url, true);
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      // Use frontend domain for return URL
      const host = 'localhost:3000';
      const returnUrl = `${protocol}://${host}/auth/steam/return`;

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
      res.writeHead(302, { Location: steamOpenIdUrl });
      res.end();
    } catch (error) {
      console.error('❌ Steam login error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Steam login failed' }));
    }
  },

  // Steam callback endpoint - FINAL DEBUG VERSION
  '/auth/steam/return': (req, res) => {
    try {
      console.log('🎯 Steam callback endpoint hit!');

      const parsedUrl = url.parse(req.url, true);
      const queryParams = parsedUrl.query;

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

                  // Close the popup
                  window.close();
                </script>
              </head>
              <body>
                <p>✅ Authentication successful! This window will close automatically.</p>
              </body>
              </html>
            `;

            res.setHeader('Content-Type', 'text/html');
            res.writeHead(200);
            res.end(responseHtml);
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
  },

  // Get current user endpoint
  '/auth/me': (req, res) => {
    try {
      console.log('👤 Get current user requested');
      const user = users.find(u => u.id === currentUserId);
      console.log('👤 Current user found:', user ? user.nickname : 'null');
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ data: user || null }));
    } catch (error) {
      console.error('❌ Get current user error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({ data: null }));
    }
  },

  // Get user's Steam inventory - REAL INVENTORY API
  '/inventory/:steamId': (req, res) => {
    try {
      console.log('📦 Inventory endpoint requested');

      const parsedUrl = url.parse(req.url, true);
      const pathParts = parsedUrl.pathname.split('/');
      const steamId = pathParts[2];
      const appId = parsedUrl.query.appId || '730';

      console.log(`📦 Steam ID: ${steamId}, App ID: ${appId}`);

      if (!steamId) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Steam ID is required' }));
        return;
      }

      console.log(`📦 Fetching Steam inventory for user: ${steamId}, App ID: ${appId}`);

      getSteamInventory(steamId, appId)
        .then(result => {
          console.log(`✅ Successfully retrieved ${result.totalCount} items from Steam inventory`);
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            data: result
          }));
        })
        .catch(error => {
          console.error('❌ Steam inventory error:', error.message);
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(500);
          res.end(JSON.stringify({
            success: false,
            error: error.message,
            message: error.message.includes('private') || error.message.includes('empty')
              ? 'Inventory is private or empty. Please check your Steam privacy settings.'
              : 'Failed to retrieve inventory'
          }));
        });

    } catch (error) {
      console.error('❌ Inventory endpoint error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({
        success: false,
        error: 'Server error'
      }));
    }
  },

  // Get current user's inventory
  '/inventory/me': (req, res) => {
    try {
      console.log('📦 My inventory endpoint requested');

      const currentUser = users.find(u => u.id === currentUserId);
      if (!currentUser) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(401);
        res.end(JSON.stringify({
          success: false,
          error: 'Not authenticated'
        }));
        return;
      }

      console.log('📦 Redirecting to inventory for user:', currentUser.steamId);
      const redirectUrl = `/inventory/${currentUser.steamId}`;
      const parsedUrl = url.parse(req.url, true);
      const appId = parsedUrl.query.appId;

      if (appId) {
        res.setHeader('Location', `${redirectUrl}?appId=${appId}`);
      } else {
        res.setHeader('Location', redirectUrl);
      }
      res.writeHead(302);
      res.end();
    } catch (error) {
      console.error('❌ My inventory endpoint error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({
        success: false,
        error: 'Server error'
      }));
    }
  },

  // Demo logout endpoint
  '/auth/logout': (req, res) => {
    try {
      console.log('👋 Logout requested');
      currentUserId = null;
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: 'Logged out successfully' }));
    } catch (error) {
      console.error('❌ Logout error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Logout failed' }));
    }
  }
};

// Create HTTP server
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🌐 CORS preflight request');
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`🔍 Request: ${req.method} ${req.url}`);

  // Parse URL to get pathname without query parameters
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;

  // Handle dynamic routes
  let routeHandler = null;

  // Check for exact match first
  if (routes[pathname]) {
    routeHandler = routes[pathname];
    console.log(`✅ Found exact route handler for: ${pathname}`);
  } else {
    // Check for dynamic routes
    const inventoryMatch = pathname.match(/^\/inventory\/([^\/]+)$/);
    if (inventoryMatch && routes['/inventory/:steamId']) {
      routeHandler = routes['/inventory/:steamId'];
      console.log(`✅ Found dynamic route handler for: ${pathname}`);
    }
  }

  // Route the request
  if (routeHandler) {
    try {
      routeHandler(req, res);
    } catch (error) {
      console.error('❌ Route handler error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  } else {
    console.log(`❌ Route not found: ${pathname} (full: ${req.url})`);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Route not found' }));
  }
});

// Start server
const PORT = process.env.PORT || 3011;
server.listen(PORT, () => {
  console.log(`🚀 FINAL Steam Inventory Service запущен на порту ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 Все эндпоинты доступны:`);
  console.log(`   - http://localhost:${PORT}/auth/steam (login)`);
  console.log(`   - http://localhost:${PORT}/auth/steam/return (callback)`);
  console.log(`   - http://localhost:${PORT}/auth/me (current user)`);
  console.log(`   - http://localhost:${PORT}/inventory/me (my inventory)`);
  console.log(`   - http://localhost:${PORT}/inventory/:steamId (user inventory)`);
  console.log(`   - http://localhost:${PORT}/auth/logout (logout)`);
  console.log(``);
  console.log(`🎯 РЕЖИМ ПОЛНОЙ ОТЛАДКИ ВКЛЮЧЕН`);
  console.log(`🎯 Все действия Steam OAuth будут показаны в логах`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Получен SIGTERM, завершаем работу...');
  server.close(() => {
    console.log('Steam Inventory Service остановлен');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Получен SIGINT, завершаем работу...');
  server.close(() => {
    console.log('Steam Inventory Service остановлен');
    process.exit(0);
  });
});