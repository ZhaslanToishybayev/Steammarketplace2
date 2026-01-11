const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com",
        "https://stackpath.bootstrapcdn.com"
      ],
      scriptSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "https://steamcdn-a.akamaihd.net",
        "https://community.cloudflare.steamstatic.com",
        "https://steamcommunity-a.akamaihd.net",
        "https://cdn.example.com",
        "https://*.akamaihd.net"
      ],
      connectSrc: [
        "'self'",
        "https://steamcommunity.com",
        "https://api.steampowered.com",
        "https://cdn.example.com",
        process.env.WS_URL || "'self'",
        ...(process.env.NODE_ENV !== 'production' ? ["ws://localhost:*", "wss://localhost:*"] : [])
      ].filter(src => src !== ""),
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net"
      ],
      frameSrc: [
        "'self'",
        "https://steamcommunity.com",
        "https://www.youtube.com"
      ],
      mediaSrc: [
        "'self'",
        "https://cdn.example.com",
        "https://*.akamaihd.net"
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Compression
app.use(compression());

// CORS
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : process.env.NODE_ENV === 'production'
  ? []
  : ['http://localhost:3000', 'http://localhost:3001', 'https://localhost:3000', 'https://localhost:3001'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    'X-User-Agent',
    'X-Client-Version'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
  optionsSuccessStatus: 200,
  ...(process.env.NODE_ENV === 'production' && {
    sameSite: 'strict',
    secure: true
  })
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global prefix
app.set('trust proxy', 1);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Steam auth endpoints (mock)
app.get('/api/auth/steam', (req, res) => {
  res.json({
    message: 'Steam OAuth redirect (mock)',
    redirectUrl: 'https://steamcommunity.com/openid/login'
  });
});

app.get('/api/auth/steam/return', (req, res) => {
  res.json({
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
  });
});

// Inventory endpoints (mock)
app.get('/api/inventory', (req, res) => {
  res.json({
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
  });
});

// Trading endpoints (mock)
app.get('/api/trading', (req, res) => {
  res.json({
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
  });
});

// Prices endpoints (mock)
app.get('/api/prices', (req, res) => {
  res.json({
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
  });
});

// Users endpoints (mock)
app.get('/api/users/profile', (req, res) => {
  res.json({
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
  });
});

// Swagger documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'Swagger documentation is available at /api/docs when running in development mode',
    endpoints: {
      'GET /api/health': 'Health check',
      'GET /api/auth/steam': 'Steam OAuth login',
      'GET /api/auth/steam/return': 'Steam OAuth callback',
      'GET /api/inventory': 'Get user inventory',
      'GET /api/trading': 'Get trading history',
      'GET /api/prices': 'Get item prices',
      'GET /api/users/profile': 'Get user profile'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
    statusCode: 500
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Steam Marketplace Backend is running on port ${port}`);
  console.log(`📚 API documentation available at http://localhost:${port}/api/docs`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`📖 Swagger documentation available at http://localhost:${port}/api/docs`);
  }
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down application...');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);