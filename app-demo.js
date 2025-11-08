const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'demo-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Mock Data for Demo
const mockUsers = [
  {
    _id: '1',
    steamId: '76561198000000000',
    username: 'DemoUser',
    displayName: 'Demo User',
    avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/ab/abcdef1234567890.jpg',
    wallet: { balance: 150.50, pendingBalance: 0 }
  }
];

const mockListings = [
  {
    _id: '1',
    seller: mockUsers[0],
    item: {
      marketName: 'AK-47 | Redline (Field-Tested)',
      iconUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/2/641781232.png',
      exterior: 'Field-Tested',
      rarity: 'Classified',
      float: 0.45
    },
    price: 45.99,
    status: 'active',
    views: 12
  },
  {
    _id: '2',
    seller: mockUsers[0],
    item: {
      marketName: 'AWP | Dragon Lore (Well-Worn)',
      iconUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/2/641781233.png',
      exterior: 'Well-Worn',
      rarity: 'Covert',
      float: 0.89
    },
    price: 1299.99,
    status: 'active',
    views: 45
  },
  {
    _id: '3',
    seller: mockUsers[0],
    item: {
      marketName: 'M4A4 | Howl (Minimal Wear)',
      iconUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/2/641781234.png',
      exterior: 'Minimal Wear',
      rarity: 'Contraband',
      float: 0.12
    },
    price: 3500.00,
    status: 'active',
    views: 23
  }
];

const mockTransactions = [
  {
    _id: '1',
    type: 'deposit',
    amount: 100,
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000)
  },
  {
    _id: '2',
    type: 'purchase',
    amount: -45.99,
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000)
  }
];

// Routes
app.get('/api/auth/me', (req, res) => {
  res.json(mockUsers[0]);
});

app.get('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

app.get('/api/marketplace/listings', (req, res) => {
  const { search, minPrice, maxPrice, sort } = req.query;
  let results = [...mockListings];

  if (search) {
    results = results.filter(l => l.item.marketName.toLowerCase().includes(search.toLowerCase()));
  }

  if (minPrice) {
    results = results.filter(l => l.price >= parseFloat(minPrice));
  }

  if (maxPrice) {
    results = results.filter(l => l.price <= parseFloat(maxPrice));
  }

  if (sort === 'price_asc') {
    results.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    results.sort((a, b) => b.price - a.price);
  }

  res.json({ listings: results, total: results.length });
});

app.get('/api/marketplace/listings/:id', (req, res) => {
  const listing = mockListings.find(l => l._id === req.params.id);
  if (listing) {
    res.json(listing);
  } else {
    res.status(404).json({ error: 'Listing not found' });
  }
});

app.get('/api/payments/transactions', (req, res) => {
  res.json({ transactions: mockTransactions });
});

app.get('/api/steam/inventory', (req, res) => {
  res.json({
    inventory: [
      { assetId: '1', name: 'AK-47 | Redline', tradable: true },
      { assetId: '2', name: 'AWP | Dragon Lore', tradable: true }
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    mode: 'DEMO',
    timestamp: new Date().toISOString(),
    database: 'Mock Data'
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`);
    socket.emit('notification', { message: 'Welcome to Steam Marketplace!' });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Demo mode - Error details not available' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found in demo mode' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 STEAM MARKETPLACE - DEMO MODE');
  console.log('='.repeat(60));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Demo data loaded: ${mockListings.length} listings`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ API base: http://localhost:${PORT}/api`);
  console.log('='.repeat(60) + '\n');
});

module.exports = app;
