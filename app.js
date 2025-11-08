const express = require('express');
const session = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

// Swagger documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// Sentry error tracking
const { initializeSentry, sentryMiddleware } = require('./config/sentry');
const Sentry = initializeSentry();

// Import routes
const authRoutes = require('./routes/auth');
const marketplaceRoutes = require('./routes/marketplace');
const mvpRoutes = require('./routes/mvp');
const steamRoutes = require('./routes/steam');
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');
const tradeRoutes = require('./routes/trade');
const adminRoutes = require('./routes/admin');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import Steam bot manager
const SteamBotManager = require('./services/steamBotManager');

// Import cache service
const cacheService = require('./services/cacheService');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://sgomarket.com",           // Production domain
      "https://www.sgomarket.com"        // WWW alias
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "steamcommunity.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://steamcommunity.com", "https://api.steampowered.com"],
      frameSrc: ["'self'", "steamcommunity.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
app.use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://sgomarket.com",           // Production domain
    "https://www.sgomarket.com"        // WWW alias
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Sentry error tracking middleware
if (process.env.SENTRY_DSN || process.env.NODE_ENV === 'production') {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100, // limit each IP to 100 requests per windowMs
  BODY_LIMIT: '10mb'
};

const limiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later'
  }
});
app.use(limiter);

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
});

// Body parsing middleware
app.use(express.json({ limit: RATE_LIMIT_CONFIG.BODY_LIMIT }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Steam Marketplace API Documentation'
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Database connection
let dbConnection;
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async (connection) => {
  logger.info('Connected to MongoDB');
  dbConnection = connection.connection.db;

  // Load all Mongoose models to register schemas and create collections
  require('./models');
  logger.info('✅ All models loaded and schemas registered');

  // Initialize Redis cache (optional, won't crash if Redis is down)
  if (process.env.REDIS_URL) {
    try {
      await cacheService.connect();
      logger.info('✅ Redis cache initialized');
    } catch (error) {
      logger.warn('⚠️  Redis cache initialization failed, continuing without cache:', error.message);
    }
  } else {
    logger.info('ℹ️  Redis not configured, skipping cache initialization');
  }
})
.catch(err => logger.error('MongoDB connection error:', err));

// Initialize Steam bot manager (enhanced version with async initialization)
let steamBotManager;
(async () => {
  try {
    steamBotManager = new SteamBotManager();
    const botCount = await steamBotManager.initialize();
    logger.info(`Steam Bot Manager initialized successfully with ${botCount} bots`);
  } catch (error) {
    logger.error('Failed to initialize Steam Bot Manager:', error);
  }
})();

// Make io, steamBotManager, and db available to routes
app.use((req, res, next) => {
  req.io = io;
  req.steamBotManager = steamBotManager;
  req.app.locals.db = dbConnection;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/mvp', mvpRoutes);
app.use('/api/steam', steamRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files from public directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Sentry error handler (must be after errorHandler)
if (process.env.SENTRY_DSN || process.env.NODE_ENV === 'production') {
  app.use(Sentry.Handlers.errorHandler());
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;