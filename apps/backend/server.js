const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*", "https://*"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock data
let users = [];
let listings = [];
let trades = [];
let inventory = [];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'steam-marketplace-api',
    timestamp: new Date().toISOString()
  });
});

// Steam Auth endpoints
app.get('/auth/steam', (req, res) => {
  const steamApiKey = process.env.STEAM_API_KEY || 'YOUR_STEAM_API_KEY_HERE';
  const returnUrl = 'http://localhost:3002/auth/steam/return';
  const realm = 'http://localhost:3000';

  const authUrl = `https://steamcommunity.com/openid/login?` +
    `openid.ns=http://specs.openid.net/auth/2.0&` +
    `openid.mode=checkid_setup&` +
    `openid.return_to=${encodeURIComponent(returnUrl)}&` +
    `openid.realm=${encodeURIComponent(realm)}&` +
    `openid.identity=http://specs.openid.net/auth/2.0/identifier_select&` +
    `openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select`;

  res.redirect(authUrl);
});

app.get('/auth/steam/return', (req, res) => {
  // Mock successful authentication
  const mockUser = {
    steamid: '76561198012345678',
    personaname: 'TestUser',
    avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310cba5b6b1cb25d9c365fe0c.jpg',
    profileurl: 'https://steamcommunity.com/id/TestUser/'
  };

  const responseHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Steam Authentication Successful</title>
      <script>
        window.opener.postMessage({
          type: 'STEAM_AUTH_SUCCESS',
          data: {
            steamId: '${mockUser.steamid}',
            username: '${mockUser.personaname}',
            avatar: '${mockUser.avatar}',
            profileUrl: '${mockUser.profileurl}'
          }
        }, 'http://localhost:3000');
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
});

app.get('/auth/me', (req, res) => {
  // Mock current user
  res.json({
    id: '1',
    steamId: '76561198012345678',
    username: 'TestUser',
    avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310cba5b6b1cb25d9c365fe0c.jpg',
    profileUrl: 'https://steamcommunity.com/id/TestUser/',
    tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abc123def',
    tradeUrlVerified: true,
    createdAt: new Date().toISOString()
  });
});

app.post('/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// ... existing routes ...
const walletRoutes = require('./src/routes/wallet');
const instantRoutes = require('./src/routes/instant');
const escrowRoutes = require('./src/routes/escrow');
const p2pRoutes = require('./src/routes/p2p'); // <--- New Route

// Register Routes
app.use('/api/wallet', walletRoutes);
app.use('/api/instant', instantRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/p2p', p2pRoutes); // <--- Register

// User endpoints
app.get('/users/search', (req, res) => {
  const { q } = req.query;
  const mockUsers = [
    {
      id: '1',
      steamId: '76561198012345678',
      username: 'TestUser',
      avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310cba5b6b1cb25d9c365fe0c.jpg',
      profileUrl: 'https://steamcommunity.com/id/TestUser/',
      tradeOfferCount: 15,
      successfulTrades: 14,
      failedTrades: 1,
      reputation: 93.3
    },
    {
      id: '2',
      steamId: '76561198098765432',
      username: 'AnotherUser',
      avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/ab/ab1234567890abcdef1234567890abcdef.jpg',
      profileUrl: 'https://steamcommunity.com/id/AnotherUser/',
      tradeOfferCount: 8,
      successfulTrades: 8,
      failedTrades: 0,
      reputation: 100
    }
  ];

  if (q) {
    const filtered = mockUsers.filter(user =>
      user.username.toLowerCase().includes(q.toLowerCase())
    );
    res.json(filtered);
  } else {
    res.json(mockUsers);
  }
});

app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  const mockUser = {
    id: id,
    steamId: '76561198012345678',
    username: 'TestUser',
    avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310cba5b6b1cb25d9c365fe0c.jpg',
    profileUrl: 'https://steamcommunity.com/id/TestUser/',
    tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abc123def',
    tradeUrlVerified: true,
    tradeOfferCount: 15,
    successfulTrades: 14,
    failedTrades: 1,
    reputation: 93.3,
    createdAt: new Date().toISOString()
  };
  res.json(mockUser);
});

app.get('/users/:id/stats', (req, res) => {
  res.json({
    userId: req.params.id,
    totalTrades: 15,
    successfulTrades: 14,
    failedTrades: 1,
    reputation: 93.3,
    totalVolume: 250.50,
    averageTradeValue: 16.70,
    lastActive: new Date().toISOString()
  });
});

app.get('/users/:id/inventory', (req, res) => {
  const mockInventory = [
    {
      id: '1',
      assetId: '123456789',
      appId: 730,
      contextId: 2,
      classId: '1234567890123456789012345678901234567890',
      instanceId: '123456789',
      itemId: 'ak47',
      name: 'AK-47 | Redline',
      type: 'Rifle',
      rarity: 'Military',
      quality: 'Factory New',
      image: 'https://steamcommunity-a.akamaihd.net/economy/itemimages/730/ak47_redline_fn.png',
      steamValue: 250.00,
      marketValue: 275.00,
      tradable: true,
      Marketable: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      assetId: '987654321',
      appId: 730,
      contextId: 2,
      classId: '9876543210987654321098765432109876543210',
      instanceId: '987654321',
      itemId: 'm4a4',
      name: 'M4A4 | Howl',
      type: 'Rifle',
      rarity: 'Industrial',
      quality: 'Field-Tested',
      image: 'https://steamcommunity-a.akamaihd.net/economy/itemimages/730/m4a4_howl_ft.png',
      steamValue: 180.00,
      marketValue: 200.00,
      tradable: true,
      Marketable: true,
      createdAt: new Date().toISOString()
    }
  ];
  res.json(mockInventory);
});

// Inventory endpoints
app.get('/inventory/sync', (req, res) => {
  res.json({
    success: true,
    itemsSynced: 156,
    newItems: 5,
    updatedItems: 12,
    timestamp: new Date().toISOString()
  });
});

app.get('/inventory', (req, res) => {
  // Return user's inventory
  res.json([
    {
      id: '1',
      assetId: '123456789',
      name: 'AK-47 | Redline',
      image: 'https://steamcommunity-a.akamaihd.net/economy/itemimages/730/ak47_redline_fn.png',
      steamValue: 250.00,
      marketValue: 275.00,
      tradable: true
    }
  ]);
});

app.get('/inventory/value', (req, res) => {
  res.json({
    totalSteamValue: 1250.50,
    totalMarketValue: 1375.75,
    itemCount: 156,
    updatedAt: new Date().toISOString()
  });
});

// Marketplace endpoints
app.post('/listings', (req, res) => {
  const { itemId, price, type } = req.body;
  const listing = {
    id: Math.random().toString(36).substr(2, 9),
    itemId: itemId,
    price: price,
    type: type || 'fixed',
    sellerId: '1',
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  listings.push(listing);
  res.status(201).json(listing);
});

app.get('/listings', (req, res) => {
  const mockListings = [
    {
      id: '1',
      itemId: 'ak47_redline',
      name: 'AK-47 | Redline',
      type: 'Rifle',
      price: 275.00,
      seller: {
        username: 'TestUser',
        reputation: 93.3
      },
      image: 'https://steamcommunity-a.akamaihd.net/economy/itemimages/730/ak47_redline_fn.png',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      itemId: 'm4a4_howl',
      name: 'M4A4 | Howl',
      type: 'Rifle',
      price: 200.00,
      seller: {
        username: 'AnotherUser',
        reputation: 100
      },
      image: 'https://steamcommunity-a.akamaihd.net/economy/itemimages/730/m4a4_howl_ft.png',
      createdAt: new Date().toISOString()
    }
  ];
  res.json(mockListings);
});

app.get('/listings/:id', (req, res) => {
  const listing = {
    id: req.params.id,
    itemId: 'ak47_redline',
    name: 'AK-47 | Redline',
    type: 'Rifle',
    price: 275.00,
    seller: {
      username: 'TestUser',
      reputation: 93.3
    },
    image: 'https://steamcommunity-a.akamaihd.net/economy/itemimages/730/ak47_redline_fn.png',
    createdAt: new Date().toISOString()
  };
  res.json(listing);
});

app.post('/listings/:id/purchase', (req, res) => {
  res.json({
    success: true,
    purchaseId: Math.random().toString(36).substr(2, 9),
    price: 275.00,
    status: 'completed'
  });
});

app.post('/listings/:id/cancel', (req, res) => {
  res.json({
    success: true,
    cancelled: true
  });
});

// Trading endpoints
app.post('/trades', (req, res) => {
  const { targetUserId, items } = req.body;
  const trade = {
    id: Math.random().toString(36).substr(2, 9),
    senderId: '1',
    targetUserId: targetUserId,
    items: items,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  trades.push(trade);
  res.status(201).json(trade);
});

app.get('/trades', (req, res) => {
  const mockTrades = [
    {
      id: '1',
      senderId: '1',
      targetUserId: '2',
      items: [
        {
          id: '1',
          name: 'AK-47 | Redline',
          image: 'https://steamcommunity-a.akamaihd.net/economy/itemimages/730/ak47_redline_fn.png'
        }
      ],
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  ];
  res.json(mockTrades);
});

app.get('/trades/:id', (req, res) => {
  const trade = {
    id: req.params.id,
    senderId: '1',
    targetUserId: '2',
    items: [
      {
        id: '1',
        name: 'AK-47 | Redline',
        image: 'https://steamcommunity-a.akamaihd.net/economy/itemimages/730/ak47_redline_fn.png'
      }
    ],
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  res.json(trade);
});

app.post('/trades/:id/accept', (req, res) => {
  res.json({
    success: true,
    tradeId: req.params.id,
    status: 'accepted',
    completedAt: new Date().toISOString()
  });
});

app.post('/trades/:id/decline', (req, res) => {
  res.json({
    success: true,
    tradeId: req.params.id,
    status: 'declined'
  });
});

app.post('/trades/:id/cancel', (req, res) => {
  res.json({
    success: true,
    tradeId: req.params.id,
    status: 'cancelled'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Steam Marketplace API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Steam Auth: http://localhost:${PORT}/auth/steam`);
  console.log(`👥 Users API: http://localhost:${PORT}/users/search`);
  console.log(`📦 Inventory API: http://localhost:${PORT}/inventory/sync`);
  console.log(`🛒 Marketplace API: http://localhost:${PORT}/listings`);
  console.log(`🔄 Trading API: http://localhost:${PORT}/trades`);
});