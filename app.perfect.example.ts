/**
 * 🚀 ИДЕАЛЬНОЕ ПРИЛОЖЕНИЕ STEAM МАРКЕТПЛЕЙСА
 * TypeScript + Express + MongoDB + Redis + Steam Integration
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { Server } from 'socket.io';
import { createServer } from 'http';

// ===========================================
// IMPORT CUSTOM MODULES
// ===========================================

// Configurations
import { databaseConfig } from './config/database';
import { redisConfig } from './config/redis';
import { steamConfig } from './config/steam';

// Services
import { AuthService } from './services/auth.service';
import { SteamService } from './services/steam.service';
import { CacheService } from './services/cache.service';
import { QueueService } from './services/queue.service';
import { PaymentService } from './services/payment.service';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { MarketplaceController } from './controllers/marketplace.controller';
import { SteamController } from './controllers/steam.controller';

// Middleware
import { authMiddleware } from './middleware/auth.middleware';
import { validationMiddleware } from './middleware/validation.middleware';
import { errorMiddleware } from './middleware/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import steamRoutes from './routes/steam.routes';
import paymentRoutes from './routes/payment.routes';

// Utils
import { logger } from './utils/logger';
import { AppError } from './utils/errors';

// Types
import { User } from './types/user.types';

// ===========================================
// SENTRY INITIALIZATION
// ===========================================

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Http({ breadcrumbs: true }),
    new Sentry.Integrations Modules: [Sentry.Integrations.RecurringIntegrations()],
  ],
});

// ===========================================
// MAIN APPLICATION CLASS
// ===========================================

class SteamMarketplaceApp {
  public app: Application;
  private server: any;
  private io: Server;
  private redisClient: any;
  private mongoConnection: any;

  // Services
  private authService: AuthService;
  private steamService: SteamService;
  private cacheService: CacheService;
  private queueService: QueueService;
  private paymentService: PaymentService;

  // Controllers
  private authController: AuthController;
  private marketplaceController: MarketplaceController;
  private steamController: SteamController;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.initializeServices();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeWebSocket();
  }

  // ===========================================
  // INITIALIZATION
  // ===========================================

  private async initializeServices(): Promise<void> {
    // Connect to databases
    this.redisClient = await redisConfig.connect();
    this.mongoConnection = await databaseConfig.connect();

    // Initialize services
    this.cacheService = new CacheService(this.redisClient);
    this.queueService = new QueueService(this.redisClient);
    this.authService = new AuthService(this.mongoConnection, this.cacheService);
    this.steamService = new SteamService(this.mongoConnection, this.cacheService);
    this.paymentService = new PaymentService();

    // Initialize controllers
    this.authController = new AuthController(this.authService, this.cacheService);
    this.marketplaceController = new MarketplaceController(
      this.mongoConnection,
      this.cacheService,
      this.queueService
    );
    this.steamController = new SteamController(
      this.steamService,
      this.queueService,
      this.cacheService
    );

    logger.info('✅ All services initialized');
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
          scriptSrc: ["'self'", 'cdnjs.cloudflare.com'],
          imgSrc: ["'self'", 'data:', 'steamcommunity.com', 'community.cloudflare.steamstatic.com'],
          connectSrc: ["'self'", 'steamcommunity.com', 'api.steampowered.com'],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Compression
    this.app.use(compression());

    // Session
    this.app.use(session({
      store: new RedisStore({ client: this.redisClient }),
      secret: process.env.SESSION_SECRET || 'your-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'strict',
      },
    }));

    // Request logging
    this.app.use(Sentry.Handlers.requestHandler());

    // ===========================================
    // GLOBAL MIDDLEWARE
    // ===========================================

    // Add user to request if authenticated
    this.app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (req.session?.userId) {
        try {
          const user = await this.authService.getUserById(req.session.userId);
          (req as any).user = user;
        } catch (error) {
          logger.error('Error fetching user from session:', error);
        }
      }
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '2.0.0',
      });
    });

    // API Routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/marketplace', authMiddleware, marketplaceRoutes);
    this.app.use('/api/steam', authMiddleware, steamRoutes);
    this.app.use('/api/payments', authMiddleware, paymentRoutes);

    // Sentry
    this.app.use(Sentry.Handlers.errorHandler());

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      throw new AppError(`Route ${req.originalUrl} not found`, 404);
    });
  }

  private initializeErrorHandling(): void {
    // Custom error handler
    this.app.use(errorMiddleware);

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  private initializeWebSocket(): void {
    this.io.on('connection', async (socket) => {
      const userId = socket.handshake.auth.userId;

      if (userId) {
        // Join user to their room
        socket.join(`user-${userId}`);
        logger.info(`User ${userId} connected via WebSocket`);
      }

      // Trade offer events
      socket.on('trade:offer', async (data) => {
        try {
          await this.steamService.handleIncomingOffer(data.offerId, userId);
        } catch (error) {
          logger.error('Error handling trade offer:', error);
          socket.emit('trade:error', { message: 'Failed to process trade offer' });
        }
      });

      // Price alert events
      socket.on('price:alert', async (data) => {
        await this.queueService.addPriceJob({
          userId,
          itemName: data.itemName,
          targetPrice: data.targetPrice,
        });
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    logger.info('✅ WebSocket server initialized');
  }

  // ===========================================
  // SERVER CONTROL
  // ===========================================

  public async start(): Promise<void> {
    const PORT = process.env.PORT || 3001;

    this.server.listen(PORT, () => {
      logger.info(`🚀 Steam Marketplace Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    // Initialize background workers
    await this.queueService.startWorkers();
    logger.info('✅ Background workers started');

    // Initialize Steam bots
    await this.steamService.initializeBots();
    logger.info('✅ Steam bots initialized');
  }

  public async stop(): Promise<void> {
    logger.info('🛑 Stopping Steam Marketplace Server...');

    // Stop workers
    await this.queueService.stopWorkers();

    // Close database connections
    await this.redisClient.quit();
    await databaseConfig.disconnect();

    this.server.close(() => {
      logger.info('✅ Server stopped');
      process.exit(0);
    });
  }
}

// ===========================================
// BOOTSTRAP
// ===========================================

const app = new SteamMarketplaceApp();

// Graceful shutdown
process.on('SIGTERM', () => app.stop());
process.on('SIGINT', () => app.stop());

// Start server
app.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
