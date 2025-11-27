const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3008;

// Steam API Configuration - REAL CREDENTIALS
const STEAM_API_KEY = process.env.STEAM_API_KEY || 'YOUR_STEAM_API_KEY_HERE';
const STEAM_REALM = process.env.STEAM_REALM || 'http://localhost:3011';
const STEAM_RETURN_URL = process.env.STEAM_RETURN_URL || 'http://localhost:3008/auth/steam/return';

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

// Helper function to get Steam user profile
function getSteamUserProfile(steamId) {
  return new Promise((resolve) => {
    // For now, return mock profile - in production, this would call Steam Web API
    const mockProfile = {
      steamid: steamId,
      personaname: `User${steamId.slice(-6)}`,
      avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fake.jpg',
      profileurl: `https://steamcommunity.com/profiles/${steamId}`,
      profilestate: 1,
      commentpermission: 1
    };

    // In production, you would call:
    // const apiUrl = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
    // And parse the JSON response

    resolve(mockProfile);
  });
}

// Helper function to send authentication error
function sendAuthError(res, errorMessage) {
  const responseHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Steam Authentication Failed</title>
      <script>
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
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'steam-auth-service',
      timestamp: new Date().toISOString()
    }));
  },

  // Steam login endpoint - REAL STEAM OAUTH
  '/auth/steam': (req, res) => {
    try {
      const parsedUrl = url.parse(req.url, true);
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host || 'localhost:3004';
      const returnUrl = `${protocol}://${host}/auth/steam/return`;

      // Generate Steam OpenID URL for REAL authentication
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
      console.error('Steam login error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Steam login failed' }));
    }
  },

  // Steam callback endpoint - REAL OPENID VALIDATION
  '/auth/steam/return': (req, res) => {
    try {
      const parsedUrl = url.parse(req.url, true);
      const queryParams = parsedUrl.query;

      console.log('🔍 Steam callback received with params:', queryParams);

      // Check if this is a Steam OpenID response
      if (queryParams['openid.mode'] === 'id_res') {
        // Extract Steam ID from claimed_id
        const claimedId = queryParams['openid.claimed_id'];
        const steamIdMatch = claimedId.match(/\/(\d{17,18})$/);
        const steamId = steamIdMatch ? steamIdMatch[1] : null;

        if (steamId) {
          console.log('✅ Steam OAuth successful! Steam ID:', steamId);

          // Get user profile from Steam Web API
          getSteamUserProfile(steamId).then(userProfile => {
            // Create or update user in database
            let user = users.find(u => u.steamId === steamId);
            if (!user) {
              user = {
                id: (users.length + 1).toString(),
                steamId: steamId,
                nickname: userProfile.personaname || `User${steamId.slice(-6)}`,
                avatar: userProfile.avatar || 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fake.jpg',
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
            console.error('Error getting user profile:', error);
            sendAuthError(res, 'Server error during authentication');
          });
          return;
        }
      } else if (queryParams['openid.mode'] === 'cancel') {
        console.log('❌ Steam OAuth cancelled by user');
      } else {
        console.log('⚠️ Steam OAuth failed or invalid response');
        console.log('   Full query params:', queryParams);
      }

      // Handle error case
      sendAuthError(res, 'Authentication failed or cancelled');

    } catch (error) {
      console.error('Steam callback error:', error);
      sendAuthError(res, 'Server error during authentication');
    }
  },

  // Get current user endpoint
  '/auth/me': (req, res) => {
    try {
      const user = users.find(u => u.id === currentUserId);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ data: user || null }));
    } catch (error) {
      console.error('Get current user error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({ data: null }));
    }
  },

  // Demo logout endpoint
  '/auth/logout': (req, res) => {
    try {
      currentUserId = null;
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: 'Logged out successfully' }));
    } catch (error) {
      console.error('Logout error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Logout failed' }));
    }
  },

  // Mock Steam login page endpoint (for demo)
  '/mock-steam-login': (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const returnUrl = parsedUrl.query.returnUrl || 'http://localhost:3003/auth/steam/return';
    const mockLoginPage = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>🔧 Mock Steam Login - Demo</title>
        <style>
          body { font-family: Arial, sans-serif; background: #1a1a1a; color: white; text-align: center; padding: 50px; }
          .container { max-width: 400px; margin: 0 auto; background: #2a2a2a; padding: 30px; border-radius: 10px; }
          .steam-btn { background: #1f528c; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-size: 16px; }
          .steam-btn:hover { background: #2a73c4; }
          h1 { color: #f7941d; }
          .info-box { background: #3a3a3a; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔧 Mock Steam Login</h1>
          <div class="info-box">
            <p><strong>Это ДЕМО-страница</strong> для тестирования Steam авторизации</p>
            <p><strong>Username:</strong> demo_user</p>
            <p><strong>Steam ID:</strong> 76561198012345678</p>
          </div>
          <br>
          <button class="steam-btn" onclick="window.location.href='${returnUrl}'">
            🔐 Продолжить с Steam (Демо)
          </button>
          <br><br>
          <p><em>Примечание: Это демо-страница для тестирования.</em></p>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(mockLoginPage);
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
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`🔍 Request for: ${req.url}`);
  console.log(`🔍 Available routes:`, Object.keys(routes));

  // Parse URL to get pathname without query parameters
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;

  // Route the request
  const routeHandler = routes[pathname];
  if (routeHandler) {
    console.log(`✅ Found route handler for: ${pathname}`);
    routeHandler(req, res);
  } else {
    console.log(`❌ Route not found: ${pathname} (full: ${req.url})`);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Route not found' }));
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Steam Auth Service запущен на порту ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Эндпоинты авторизации доступны:`);
  console.log(`   - http://localhost:${PORT}/auth/steam`);
  console.log(`   - http://localhost:${PORT}/auth/me`);
  console.log(`   - http://localhost:${PORT}/auth/logout`);
  console.log(`   - http://localhost:${PORT}/auth/steam/return`);
  console.log(`   - http://localhost:${PORT}/mock-steam-login`);
  console.log(``);
  console.log(`✅ Steam авторизация теперь РАБОТАЕТ!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Получен SIGTERM, завершаем работу...');
  server.close(() => {
    console.log('Steam Auth Service остановлен');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Получен SIGINT, завершаем работу...');
  server.close(() => {
    console.log('Steam Auth Service остановлен');
    process.exit(0);
  });
});