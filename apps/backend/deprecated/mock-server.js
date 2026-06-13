/**
 * DEPRECATED: This mock server is no longer used in production.
 *
 * REASON: The real NestJS backend (src/main.ts) is now used in production.
 *
 * DETAILS:
 * - This file was created for initial prototyping and development
 * - The production backend uses REAL Steam APIs via NestJS modules
 * - All core services (auth, inventory, trading) use production Steam APIs
 * - Docker-compose runs the real backend via 'npm run start:dev'
 * - This mock server is kept for historical reference only
 *
 * MIGRATION:
 * - Real backend: src/main.ts (NestJS application)
 * - Real auth: Steam OpenID via passport-steam
 * - Real inventory: Steam Community API
 * - Real trading: steam-user + steam-tradeoffer-manager
 *
 * This file will be removed in a future version.
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3001;

// Mock data
const mockData = {
  health: {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  },
  inventory: {
    items: [
      {
        id: '1',
        name: 'AK-47 | Redline',
        game: 'CS:GO',
        image: 'https://steamcommunity-a.akamaihd.net/economy/image/class/730/855214247/200fx200f',
        price: 250.50,
        float: 0.025,
        paintSeed: 425
      },
      {
        id: '2',
        name: 'M4A4 | Desert-Eagle',
        game: 'CS:GO',
        image: 'https://steamcommunity-a.akamaihd.net/economy/image/class/730/855214247/200fx200f',
        price: 180.75,
        float: 0.015,
        paintSeed: 123
      }
    ],
    total: 2,
    stats: {
      totalItems: 2,
      totalValue: 431.25,
      lastSync: new Date().toISOString()
    }
  },
  trading: {
    trades: [
      {
        id: '1',
        partner: '76561198012345678',
        status: 'completed',
        items: [
          {
            id: '1',
            name: 'AK-47 | Redline',
            price: 250.50
          }
        ],
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      }
    ],
    statistics: {
      totalTrades: 1,
      totalVolume: 250.50,
      successRate: 100
    }
  },
  prices: {
    prices: [
      {
        appId: 730,
        name: 'CS:GO',
        items: [
          {
            classid: '855214247',
            name: 'AK-47 | Redline',
            price: 250.50,
            volume: 150,
            trend: 'up'
          }
        ]
      }
    ],
    lastUpdated: new Date().toISOString()
  },
  user: {
    user: {
      id: '123456789',
      username: 'mock_user',
      avatar: 'https://cdn.example.com/avatar.jpg',
      steamId: '76561198012345678',
      tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abc123',
      balance: 500.75,
      createdAt: '2023-01-01T00:00:00.000Z',
      lastLogin: new Date().toISOString()
    }
  }
};

// Request handler
const requestHandler = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathName = parsedUrl.pathname;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, X-User-Agent, X-Client-Version');
  res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');

  // Handle preflight requests
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Set content type
  res.setHeader('Content-Type', 'application/json');

  // Routes
  try {
    if (pathName === '/api/health' && method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(mockData.health));
    }
    else if (pathName === '/api/inventory' && method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(mockData.inventory));
    }
    else if (pathName === '/api/trading' && method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(mockData.trading));
    }
    else if (pathName === '/api/prices' && method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(mockData.prices));
    }
    else if (pathName === '/api/users/profile' && method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(mockData.user));
    }
    else if (pathName === '/api/auth/steam' && method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({
        message: 'Steam OAuth redirect (mock)',
        redirectUrl: 'https://steamcommunity.com/openid/login'
      }));
    }
    else if (pathName === '/api/auth/steam/return' && method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({
        message: 'Steam OAuth callback (mock)',
        user: {
          id: '123456789',
          username: 'mock_user',
          avatar: 'https://cdn.example.com/avatar.jpg'
        },
        tokens: {
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token'
        }
      }));
    }
    else if (pathName === '/api/docs' && method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({
        message: 'API documentation (mock)',
        endpoints: {
          'GET /api/health': 'Health check',
          'GET /api/auth/steam': 'Steam OAuth login',
          'GET /api/auth/steam/return': 'Steam OAuth callback',
          'GET /api/inventory': 'Get user inventory',
          'GET /api/trading': 'Get trading history',
          'GET /api/prices': 'Get item prices',
          'GET /api/users/profile': 'Get user profile'
        }
      }));
    }
    else {
      res.writeHead(404);
      res.end(JSON.stringify({
        error: 'Not Found',
        message: `Route ${pathName} not found`,
        statusCode: 404
      }));
    }
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
      statusCode: 500
    }));
  }
};

// Create server
const server = http.createServer(requestHandler);

// Start server
server.listen(port, () => {
  console.log(`🚀 Steam Marketplace Backend is running on port ${port}`);
  console.log(`📚 API documentation available at http://localhost:${port}/api/docs`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`📖 API endpoints available at http://localhost:${port}/api/`);
  }
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down application...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);