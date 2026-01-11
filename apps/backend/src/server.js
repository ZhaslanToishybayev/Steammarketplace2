require('./polyfill');
require('dotenv').config();
require('./config/validator');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const passport = require('passport');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { setupSteamStrategy } = require('./steam-middleware');

// Redis and logging
const { redisClient, pubClient, subClient, testRedisConnection, closeRedisConnections } = require('./config/redis');
const { logger, requestLoggerMiddleware } = require('./utils/logger');
const { requestIdMiddleware } = require('./middleware/request-id');
const { apiLimiter, authLimiter, sensitiveOperationsLimiter } = require('./middleware/rate-limiter');
const { register, metricsMiddleware, updateBotMetrics } = require('./services/metrics.service');
const { runMigrations } = require('./utils/migrate');

// Database and Bot initialization
const { testConnection, initializeTables, pool, query } = require('./config/database');
const { initializeBots } = require('./config/bots.config');
// Bot and Queue services are conditionally loaded
// When RUN_WORKER=false, these run in a separate worker process
const RUN_WORKER_INLINE = process.env.RUN_WORKER !== 'false';

const app = express();
const server = http.createServer(app);

// ========== SOCKET.IO SETUP ==========
// Socket.io CORS configuration for production domain
  const frontendOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const origins = frontendOrigin.split(',').map(o => o.trim());

  const io = new Server(server, {
    cors: {
      origin: true, // Allow any origin with credentials (for dev)
      credentials: true,
      methods: ["GET", "POST"]
    },
  });

// Socket.io Redis adapter for horizontal scaling
io.adapter(createAdapter(pubClient, subClient));
logger.info('Socket.io Redis adapter configured');

// Socket.io authentication middleware
io.use((socket, next) => {
  // In production: verify JWT token
  const token = socket.handshake.auth.token;
  // Allow passing steamId directly in query for simplicity in this setup
  const steamId = socket.handshake.query.steamId || socket.handshake.auth.steamId;

  if (token) {
    // Verify token and attach user (Mock logic here, replace with real JWT verify if needed)
    socket.user = { steamId: 'mock-steam-id' };
  } else if (steamId) {
      // Trust the client-provided steamId (INSECURE for prod, but OK for MVP/Localhost with cookie auth on endpoints)
      // Ideally we should parse the cookie 'connect.sid' here using passport.socketio, but that's heavy.
      socket.user = { steamId };
  }
  next();
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Join user's personal room for targeted updates
  if (socket.user?.steamId) {
    socket.join(`user:${socket.user.steamId}`);
    console.log(`[Socket.io] User ${socket.user.steamId} joined personal room`);
  }

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });

  // Join trade room for real-time updates
  socket.on('trade:subscribe', (tradeUuid) => {
    socket.join(`trade:${tradeUuid}`);
    console.log(`[Socket.io] Client subscribed to trade: ${tradeUuid}`);
  });

  socket.on('trade:unsubscribe', (tradeUuid) => {
    socket.leave(`trade:${tradeUuid}`);
  });
});

// Make io accessible to routes
app.set('io', io);

// Trust proxy in production AND dev (since we use Next.js proxy)
app.set('trust proxy', 1);

// ========== НАСТРОЙКИ ==========
app.use(cors({
  origin: origins,
  credentials: true
}));

const helmet = require('helmet');
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow resource sharing for avatars etc
  contentSecurityPolicy: false // Disable CSP for now (often breaks things without careful config)
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser for httpOnly JWT cookies
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Request ID middleware (must be early in chain)
app.use(requestIdMiddleware);

// Request logging middleware
app.use(requestLoggerMiddleware);

// Prometheus metrics middleware (collect request metrics)
app.use(metricsMiddleware);

// Rate limiting - apply to all API routes
app.use('/api/', apiLimiter);


// Redis Session Store (replaces PostgreSQL for better performance)
app.use(session({
  store: new RedisStore({
    client: redisClient,
    database: parseInt(process.env.REDIS_SESSIONS_DB || '0')
  }),
  secret: process.env.SESSION_SECRET || 'steam-marketplace-local',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Сериализация
// Сериализация (сохраняем только ID)
passport.serializeUser((user, done) => {
  done(null, user.steamId || user.steam_id);
});

// Десериализация (получаем свежие данные из БД)
passport.deserializeUser(async (steamId, done) => {
  try {
    const res = await query('SELECT * FROM users WHERE steam_id = $1', [steamId]);
    if (res.rows.length > 0) {
      // Преобразуем trade_url в camelCase если нужно, или просто отдаем как есть
      // Passport обычно кладет это в req.user
      const user = res.rows[0];
      // Map keys to camelCase to match expected format primarily if legacy code expects it
      user.steamId = user.steam_id;
      user.tradeUrl = user.trade_url;
      done(null, user);
    } else {
      done(null, null);
    }
  } catch (err) {
    console.error('Deserialize error:', err);
    done(err);
  }
});

// Настройка Steam стратегии
setupSteamStrategy(passport);

// ========== РОУТЫ ==========
const authRoutes = require('./routes/auth');
const mockAuthRoutes = require('./routes/mock-auth');
const inventoryRoutes = require('./routes/inventory');
const profileRoutes = require('./routes/profile');
const escrowRoutes = require('./routes/escrow');
const instantRoutes = require('./routes/instant');
const steamCacheRoutes = require('./routes/steam-cache.routes');
const steamManagerRoutes = require("./routes/steam-manager.routes");

app.use('/api/auth', authRoutes);
app.use('/api/mock-auth', mockAuthRoutes); // Mock auth for testing
app.use('/auth', authRoutes); // Fallback for compatibility
app.use('/api/inventory', inventoryRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/instant', instantRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/steam', steamCacheRoutes);
app.use("/api/steam-optimized", steamManagerRoutes);
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/support', require('./routes/support'));
app.use('/api/batch', require('./routes/batch'));
app.use('/api/referral', require('./routes/referral'));
app.use('/api/watchlist', require('./routes/watchlist'));
app.use('/api/p2p', require('./routes/p2p'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/bots', require('./routes/bots'));

// ========== HEALTH CHECK ENDPOINTS ==========

// Liveness probe - just confirms the process is running (for K8s livenessProbe)
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness probe - checks all dependencies (for K8s readinessProbe)
app.get('/health/ready', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    bots: { online: 0, total: 0 },
  };

  try {
    // Check database
    const { pool } = require('./config/database');
    const dbResult = await pool.query('SELECT 1');
    checks.database = dbResult.rows.length > 0;
  } catch (err) {
    checks.database = false;
  }

  try {
    // Check Redis
    const { redisClient } = require('./config/redis');
    const pong = await redisClient.ping();
    checks.redis = pong === 'PONG';
  } catch (err) {
    checks.redis = false;
  }

  try {
    // Check bots (only if RUN_WORKER_INLINE is true)
    if (RUN_WORKER_INLINE) {
      const botManager = require('./services/bot-manager.service').botManager;
      const stats = botManager.getStatistics();
      checks.bots = { online: stats.onlineBots, total: stats.totalBots };
    } else {
      checks.bots = { online: 0, total: 0, note: 'Bots run in separate worker process' };
    }
  } catch (err) {
    checks.bots = { online: 0, total: 0, error: 'Bot check failed' };
  }

  const isReady = checks.database && checks.redis;
  const status = isReady ? 'ready' : 'not_ready';

  res.status(isReady ? 200 : 503).json({
    status,
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Legacy health check (backwards compatible)
app.get('/api/health', async (req, res) => {
  const steamService = require('./config/steam');
  const isSteamConnected = await steamService.testConnection();
  
  res.json({
    status: 'OK',
    service: 'Steam Marketplace API',
    steam_configured: isSteamConnected,
    escrow_enabled: true,
    websocket_enabled: true,
    timestamp: new Date().toISOString()
  });
});

// ========== PROMETHEUS METRICS ENDPOINT ==========
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// Test Steam auth
app.get('/test-steam', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; padding: 20px;">
        <h1>Test Steam Authentication</h1>
        <p>Click to test Steam login:</p>
          <a href="/api/auth/steam" style="display: inline-block; padding: 10px 20px; background: #171a21; color: #66c0f4; text-decoration: none; border-radius: 4px; font-weight: bold;">Login with Steam</a>
        </a>
        <p>This should redirect to: <code>http://localhost:3000?auth=success&steamid=...</code></p>
      </body>
    </html>
  `);
});

// ========== GLOBAL ERROR HANDLING ==========
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be LAST)
app.use(errorHandler);

// ========== ЗАПУСК ==========
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Test Redis connection
    logger.info('🔄 Connecting to Redis...');
    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      logger.warn('⚠️ Redis not available. Sessions will not persist across restarts.');
    }

    // Test database connection
    logger.info('🔄 Connecting to database...');
    const dbConnected = await testConnection();
    if (dbConnected) {
      // Run pending migrations
      await runMigrations();
      await initializeTables();
    } else {
      logger.warn('⚠️ Database not available. Some features may not work.');
    }

    // Initialize notification service with Socket.io
    const { notificationService } = require('./services/notification.service');
    notificationService.initialize(io);
    console.log('🔔 Notification service initialized');

    // Initialize WebSocket Notification Service (Real-Time Updates)
    const WebSocketNotificationService = require('./services/websocket-notification.service');
    const wsNotificationService = new WebSocketNotificationService(server);
    wsNotificationService.startHeartbeat();

    // Register with singleton for cross-service access
    const { setWsNotificationService } = require('./services/ws-notifier');
    setWsNotificationService(wsNotificationService);
    console.log('📡 WebSocket Real-Time Notification Service initialized');

    // Initialize Steam bots (only if running inline, not in separate worker)
    if (RUN_WORKER_INLINE) {
      // Dynamically require services only when needed
      require('./services/deposit.service');
      require('./services/escrow-listener.service');
      const { initializeBots } = require('./config/bots.config');
      const botManager = require('./services/bot-manager.service');
      const { tradeQueueService } = require('./services/trade-queue.service');

      console.log('🤖 Initializing Steam bots...');
      const botResult = await initializeBots();
      if (!botResult.success && botResult.message !== 'No bots configured') {
        console.log('⚠️ Some bots failed to start. Check credentials.');
      }

      // Start Trade Queue Processor (Rate Limited: 25/min)
      console.log('📬 Starting Trade Queue Processor...');
      tradeQueueService.processTradeQueue(1, async (job) => {
        console.log(`[Queue] Processing trade job ${job.id}:`, job.data.type);
        try {
          const { tradeUrl, itemsToReceive, itemsToGive, message, tradeUuid } = job.data;
          const { offerId } = await botManager.sendTradeOffer({
            tradeUrl,
            itemsToReceive,
            itemsToGive,
            message,
          });
          console.log(`[Queue] Trade offer sent: ${offerId} for job ${job.id}`);
          return { offerId, tradeUuid };
        } catch (err) {
          console.error(`[Queue] Trade job ${job.id} failed:`, err.message);
          throw err; // Bull will retry based on config
        }
      });
      console.log('✅ Trade Queue Processor started.');
    } else {
      console.log('ℹ️ Running in API-only mode. Bots and Queue run in separate worker process.');
    }

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Backend запущен: http://localhost:${PORT}`);
      console.log(`🔐 Steam Auth: http://localhost:3000/api/auth/steam`);
      console.log(`🛒 Escrow API: http://localhost:3000/api/escrow`);
      console.log(`📡 WebSocket: ws://localhost:${PORT}`);
      console.log(`🧪 Test: http://localhost:${PORT}/test-steam`);
      console.log(`✅ Готово! Escrow trade system активирован.`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

// ========== GRACEFUL SHUTDOWN ==========
const gracefulShutdown = async (signal) => {
  logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    server.close(() => {
      logger.info('✅ HTTP server closed');
    });

    // Stop all bots
    logger.info('🤖 Stopping bots...');
    const { botManager } = require('./config/bots.config');
    if (botManager) {
      botManager.stopAll();
    }
    logger.info('✅ Bots stopped');

    // Close Redis connections
    logger.info('🔴 Closing Redis connections...');
    await closeRedisConnections();

    // Close database pool
    logger.info('📦 Closing database connections...');
    const { pool } = require('./config/database');
    await pool.end();
    logger.info('✅ Database pool closed');

    logger.info('👋 Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Error during shutdown:', { error: err.message });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Export for testing
module.exports = { app, server, io };

