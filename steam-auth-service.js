const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3005'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'steam-auth-service',
    timestamp: new Date().toISOString()
  });
});

// Steam login endpoint
app.get('/auth/steam', (req, res) => {
  try {
    const returnUrl = `${req.protocol}://${req.get('host')}/auth/steam/return`;
    const realm = process.env.STEAM_REALM || `${req.protocol}://${req.get('host')}`;

    // For demo, redirect to mock Steam login page
    const mockAuthUrl = `http://localhost:3000/mock-steam-login?returnUrl=${encodeURIComponent(returnUrl)}`;
    res.redirect(mockAuthUrl);
  } catch (error) {
    console.error('Steam login error:', error);
    res.status(500).json({ error: 'Steam login failed' });
  }
});

// Steam callback endpoint
app.get('/auth/steam/return', (req, res) => {
  try {
    // Mock Steam callback - in real implementation, this would validate OpenID response
    const mockSteamId = '76561198012345678';
    const mockUserProfile = {
      steamid: mockSteamId,
      personaname: 'TestUser',
      avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fake.jpg',
      profileurl: `https://steamcommunity.com/profiles/${mockSteamId}`
    };

    // Create or update user in database
    let user = users.find(u => u.steamId === mockSteamId);
    if (!user) {
      user = {
        id: (users.length + 1).toString(),
        steamId: mockSteamId,
        nickname: mockUserProfile.personaname,
        avatar: mockUserProfile.avatar,
        profileUrl: mockUserProfile.profileurl,
        tradeUrl: `https://steamcommunity.com/trade/${mockSteamId.replace('7656119', '123456789')}/tradeoffers/`,
        apiKey: `mock_api_key_${Date.now()}`,
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
    }

    // Set current user for demo
    currentUserId = user.id;

    // Generate mock authentication tokens
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
      accessToken: 'demo-access-token-' + Date.now(),
      expiresIn: 900
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
          }, '${process.env.STEAM_REALM || 'http://localhost:3000'}');

          // Close the popup
          window.close();
        </script>
      </head>
      <body>
        <p>Authentication successful! This window will close automatically.</p>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(responseHtml);
  } catch (error) {
    console.error('Steam callback error:', error);
    const responseHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Steam Authentication Failed</title>
        <script>
          window.opener.postMessage({
            type: 'STEAM_AUTH_ERROR',
            data: { error: 'Authentication failed' }
          }, '${process.env.STEAM_REALM || 'http://localhost:3000'}');
          window.close();
        </script>
      </head>
      <body>
        <p>Authentication failed! This window will close automatically.</p>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send(responseHtml);
  }
});

// Get current user endpoint
app.get('/auth/me', (req, res) => {
  try {
    const user = users.find(u => u.id === currentUserId);
    if (user) {
      res.json({ data: user });
    } else {
      res.json({ data: null });
    }
  } catch (error) {
    console.error('Get current user error:', error);
    res.json({ data: null });
  }
});

// Demo logout endpoint
app.post('/auth/logout', (req, res) => {
  try {
    currentUserId = null;
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Mock Steam login page endpoint (for demo)
app.get('/mock-steam-login', (req, res) => {
  const returnUrl = req.query.returnUrl || 'http://localhost:3003/auth/steam/return';

  const mockLoginPage = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mock Steam Login - Demo</title>
      <style>
        body { font-family: Arial, sans-serif; background: #1a1a1a; color: white; text-align: center; padding: 50px; }
        .container { max-width: 400px; margin: 0 auto; background: #2a2a2a; padding: 30px; border-radius: 10px; }
        .steam-btn { background: #1f528c; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-size: 16px; }
        .steam-btn:hover { background: #2a73c4; }
        h1 { color: #f7941d; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔧 Mock Steam Login</h1>
        <p>This is a demo page simulating Steam authentication.</p>
        <p><strong>Username:</strong> demo_user</p>
        <p><strong>Steam ID:</strong> 76561198012345678</p>
        <br>
        <button class="steam-btn" onclick="window.location.href='${returnUrl}'">
          🔐 Continue with Steam (Demo)
        </button>
        <br><br>
        <p><em>Note: This is a mock for testing purposes only.</em></p>
      </div>
    </body>
    </html>
  `;

  res.send(mockLoginPage);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Steam Auth Service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints available at:`);
  console.log(`   - http://localhost:${PORT}/auth/steam`);
  console.log(`   - http://localhost:${PORT}/auth/me`);
});

module.exports = app;