const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = 3002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mock data
const mockUsers = [
  { id: 1, username: 'demo_user', steamId: '76561198012345678', tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=12345678&token=abc123' },
  { id: 2, username: 'steam_gamer', steamId: '76561198087654321', tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=87654321&token=def456' }
];

const mockItems = [
  { id: 1, name: 'AK-47 | Redline (Factory New)', price: 245.99, game: 'CS:GO', float: 0.02, image: 'https://steamcommunity-a.akamaihd.net/economy/image/class/730/210234827/200fx200f' },
  { id: 2, name: 'M4A1-S | Blood Tiger (Minimal Wear)', price: 189.50, game: 'CS:GO', float: 0.08, image: 'https://steamcommunity-a.akamaihd.net/economy/image/class/730/210234828/200fx200f' },
  { id: 3, name: 'The messenger (Battle-Scarred)', price: 45.25, game: 'Rust', image: 'https://steamcommunity-a.akamaihd.net/economy/image/class/252490/210234829/200fx200f' }
];

const mockTrades = [
  { id: 1, userId: 1, items: [1, 2], total: 435.49, status: 'completed', createdAt: '2024-11-24T10:00:00Z' },
  { id: 2, userId: 2, items: [3], total: 45.25, status: 'pending', createdAt: '2024-11-24T12:00:00Z' }
];

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    info: {
      database: { status: 'up' },
      redis: { status: 'up' },
      steam_api: { status: 'up' }
    }
  });
});

app.get('/api/users', (req, res) => {
  res.json(mockUsers);
});

app.get('/api/users/:id', (req, res) => {
  const user = mockUsers.find(u => u.id === parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.get('/api/items', (req, res) => {
  const { game, limit = 10, offset = 0 } = req.query;
  let items = mockItems;

  if (game) {
    items = items.filter(item => item.game.toLowerCase() === game.toLowerCase());
  }

  const paginated = items.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  res.json({
    items: paginated,
    total: items.length,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

app.get('/api/items/:id', (req, res) => {
  const item = mockItems.find(i => i.id === parseInt(req.params.id));
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(item);
});

app.get('/api/trades', (req, res) => {
  const { status, userId } = req.query;
  let trades = mockTrades;

  if (status) {
    trades = trades.filter(t => t.status === status);
  }

  if (userId) {
    trades = trades.filter(t => t.userId === parseInt(userId));
  }

  res.json(trades);
});

app.get('/api/trades/:id', (req, res) => {
  const trade = mockTrades.find(t => t.id === parseInt(req.params.id));
  if (!trade) {
    return res.status(404).json({ error: 'Trade not found' });
  }
  res.json(trade);
});

app.post('/api/trades', (req, res) => {
  const { userId, items } = req.body;

  if (!userId || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  const newTrade = {
    id: mockTrades.length + 1,
    userId: parseInt(userId),
    items,
    total: items.reduce((sum, itemId) => {
      const item = mockItems.find(i => i.id === itemId);
      return sum + (item ? item.price : 0);
    }, 0),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  mockTrades.push(newTrade);
  res.status(201).json(newTrade);
});

app.get('/api/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`# Steam Marketplace Metrics

# Basic system metrics
http_requests_total{method="GET",endpoint="/api/health"} 1234
http_requests_total{method="GET",endpoint="/api/items"} 5678
http_requests_total{method="POST",endpoint="/api/trades"} 123

# Response times (milliseconds)
http_request_duration_ms{method="GET",endpoint="/api/health"} 25
http_request_duration_ms{method="GET",endpoint="/api/items"} 150
http_request_duration_ms{method="POST",endpoint="/api/trades"} 300

# Active users
users_total 1542
inventories_total 89234
trades_total 56789
wallet_balance_total 234567.89

# Bot metrics
bots_total 5
bots_online 3
bots_active 2
bots_busy 1
bots_idle 1

# Database metrics
db_connection_pool_size 10
db_active_connections 7
db_query_duration_ms 45
`);
});

app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Steam Marketplace API Documentation',
    version: '1.0.0',
    description: 'API for Steam item trading marketplace',
    endpoints: {
      'GET /api/health': 'System health check',
      'GET /api/users': 'List all users',
      'GET /api/users/:id': 'Get user by ID',
      'GET /api/items': 'List items with filtering',
      'GET /api/items/:id': 'Get item by ID',
      'GET /api/trades': 'List trades with filtering',
      'GET /api/trades/:id': 'Get trade by ID',
      'POST /api/trades': 'Create new trade',
      'GET /api/metrics': 'Prometheus metrics',
      'GET /api/docs': 'API documentation'
    },
    examples: {
      'Get items': 'curl http://localhost:3001/api/items?game=CS:GO&limit=5',
      'Create trade': 'curl -X POST http://localhost:3001/api/trades -H "Content-Type: application/json" -d \'{"userId": 1, "items": [1, 2]}\''
    }
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Steam Marketplace API Server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   - Health: http://localhost:${PORT}/api/health`);
  console.log(`   - Items: http://localhost:${PORT}/api/items`);
  console.log(`   - Trades: http://localhost:${PORT}/api/trades`);
  console.log(`   - Metrics: http://localhost:${PORT}/api/metrics`);
  console.log(`   - Docs: http://localhost:${PORT}/api/docs`);
  console.log(`\n💡 The backend API is now accessible for testing!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down API server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down API server...');
  process.exit(0);
});