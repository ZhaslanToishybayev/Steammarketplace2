---
name: steam-marketplace-backend
description: Comprehensive backend development patterns for Steam Marketplace project using Node.js/Express/JavaScript with MongoDB/Mongoose. Covers Steam integration, marketplace functionality, Socket.io real-time features, and trading systems.
---

# Steam Marketplace Backend Guidelines

## Purpose

Establish consistent best practices for Steam Marketplace backend development using Node.js/Express with JavaScript, MongoDB/Mongoose, Steam API integration, and real-time Socket.io features.

## When to Use This Skill

Automatically activates when working on:
- Backend routes, endpoints, APIs (routes/*.js)
- Database models with Mongoose (models/*.js)
- Business logic services (services/*.js)
- Steam bot integration (SteamUser, TradeOfferManager)
- Steam authentication (Passport.js SteamStrategy)
- Marketplace functionality (listings, purchases, payments)
- Real-time features (Socket.io)
- Middleware development
- Steam API interactions
- Trade offer handling

## Project Architecture

### Current Structure

```
/home/zhaslan/Downloads/Steammarketplace2-main/
├── app.js                    # Main Express application
├── routes/                   # API route definitions
│   ├── auth.js              # Steam OAuth authentication
│   ├── marketplace.js       # Listings, purchases, sales
│   ├── steam.js             # Steam API integration
│   ├── payments.js          # Stripe payment processing
│   ├── users.js             # User management
│   └── mvp.js               # MVP demo endpoints
├── models/                   # Mongoose database models
│   ├── User.js             # Steam user data
│   ├── MarketListing.js    # Marketplace listings
│   └── Transaction.js      # Payment transactions
├── services/                 # Business logic
│   ├── steamBotManager.js  # Steam bot management
│   └── marketplaceService.js # Trading logic
├── middleware/              # Express middleware
│   ├── auth.js             # JWT authentication
│   ├── validation.js       # Input validation
│   └── errorHandler.js     # Error handling
└── utils/
    └── logger.js           # Winston logger
```

### Technology Stack

- **Runtime:** Node.js 16+
- **Framework:** Express.js 4.x
- **Language:** JavaScript (ES6+)
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** Passport.js + SteamStrategy + JWT
- **Steam Integration:** steam-user, steam-tradeoffer-manager
- **Real-time:** Socket.io 4.x
- **Payments:** Stripe API
- **Validation:** Joi
- **Logging:** Winston

## Best Practices

### 1. Route Structure

**Good Pattern:**
```javascript
// routes/marketplace.js
const express = require('express');
const router = express.Router();
const MarketListing = require('../models/MarketListing');
const { authenticateToken } = require('../middleware/auth');
const { validateListing } = require('../middleware/validation');

// GET /api/marketplace/listings - Get all listings
router.get('/listings', async (req, res) => {
  try {
    const listings = await MarketListing.find({ status: 'active' })
      .populate('seller', 'username displayName avatar reputation');
    res.json(listings);
  } catch (error) {
    req.app.locals.logger.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// POST /api/marketplace/listings - Create listing
router.post('/listings', authenticateToken, validateListing, async (req, res) => {
  try {
    // Implementation
  } catch (error) {
    // Error handling
  }
});

module.exports = router;
```

**Key Principles:**
- One route per HTTP method
- Delegate business logic to services
- Use middleware for auth and validation
- Always wrap in try-catch
- Log errors with req.app.locals.logger
- Return consistent error responses
- Use async/await (not callbacks)

### 2. Mongoose Models

**Good Pattern:**
```javascript
// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  steamId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    required: true
  },
  tradeUrl: {
    type: String,
    default: null
  },
  wallet: {
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingBalance: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  steamInventory: [{
    assetId: String,
    name: String,
    tradable: Boolean,
    lastUpdated: Date
  }]
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ steamId: 1 });
userSchema.index({ 'wallet.balance': 1 });

// Virtual for reputation percentage
userSchema.virtual('reputationPercentage').get(function() {
  if (this.reputation.total === 0) return 100;
  return Math.round((this.reputation.positive / this.reputation.total) * 100);
});

// Method to update inventory
userSchema.methods.updateInventory = async function(steamInventory) {
  this.steamInventory = steamInventory.map(item => ({
    assetId: item.assetid,
    name: item.name,
    tradable: item.tradable === 1,
    lastUpdated: new Date()
  }));
  await this.save();
};

// Ensure virtuals are serialized
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
```

**Key Principles:**
- Define required fields with type and validation
- Use defaults for optional fields
- Add indexes for frequently queried fields
- Create virtuals for computed values
- Add methods for business logic
- Always export with mongoose.model()
- Set toJSON to include virtuals

### 3. Steam Integration

**Steam Bot Manager:**
```javascript
// services/steamBotManager.js
const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');
const logger = require('../utils/logger');

class SteamBotManager {
  constructor() {
    this.bots = new Map();
    this.tradeQueue = [];
    this.isProcessingTrades = false;
  }

  initialize() {
    const botConfigs = this.getBotConfigs();

    botConfigs.forEach((config, index) => {
      this.createBot(config, index);
    });

    this.startTradeProcessor();
  }

  getBotConfigs() {
    return [
      {
        username: process.env.STEAM_BOT_1_USERNAME,
        password: process.env.STEAM_BOT_1_PASSWORD,
        sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET,
        identitySecret: process.env.STEAM_BOT_1_IDENTITY_SECRET
      }
    ].filter(config => config.username && config.password);
  }

  createBot(config, index) {
    const client = new SteamUser();
    const manager = new TradeOfferManager({
      steam: client,
      language: 'en'
    });

    const bot = {
      id: `bot_${index}`,
      client,
      manager,
      config,
      isOnline: false,
      isAvailable: true,
      currentTrades: 0,
      maxTrades: 5
    };

    this.setupBotEventHandlers(bot);
    this.bots.set(bot.id, bot);
    this.loginBot(bot);
  }

  setupBotEventHandlers(bot) {
    const { client, manager } = bot;

    client.on('steamGuard', (domain, callback, lastCodeWrong) => {
      // Handle Steam Guard if needed
      logger.warn('Steam Guard required for bot', bot.id);
    });

    client.on('loggedOn', () => {
      logger.info(`Bot ${bot.id} logged in successfully`);
      bot.isOnline = true;

      client.setPersona(SteamUser.EPersonaState.Online);
      client.gamesPlayed({ games: 730 }); // CS2
    });

    manager.on('newOffer', (offer) => {
      logger.info(`New trade offer received: ${offer.id}`);
      // Handle incoming trade offer
    });
  }

  async loginBot(bot) {
    try {
      bot.client.logOn({
        accountName: bot.config.username,
        password: bot.config.password,
        twoFactorCode: this.getTwoFactorCode(bot.config.sharedSecret)
      });
    } catch (error) {
      logger.error(`Bot ${bot.id} login failed:`, error);
    }
  }

  getTwoFactorCode(sharedSecret) {
    // Implementation for TOTP code generation
    // Use steam-totp library
  }

  startTradeProcessor() {
    setInterval(() => {
      this.processTradeQueue();
    }, 5000); // Check every 5 seconds
  }

  async processTradeQueue() {
    if (this.isProcessingTrades || this.tradeQueue.length === 0) {
      return;
    }

    this.isProcessingTrades = true;

    try {
      const trade = this.tradeQueue.shift();
      await this.executeTrade(trade);
    } catch (error) {
      logger.error('Trade processing error:', error);
    } finally {
      this.isProcessingTrades = false;
    }
  }

  async executeTrade(trade) {
    // Implementation for trade execution
  }
}

module.exports = SteamBotManager;
```

### 4. Steam Authentication

**SteamStrategy Configuration:**
```javascript
// routes/auth.js
const express = require('express');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

passport.use(new SteamStrategy({
  returnURL: `${process.env.BASE_URL}/api/auth/steam/return`,
  realm: process.env.BASE_URL,
  apiKey: process.env.STEAM_API_KEY
}, async (identifier, profile, done) => {
  try {
    const steamId = identifier.split('/').pop();

    let user = await User.findOne({ steamId });

    if (!user) {
      user = new User({
        steamId,
        username: profile.username,
        displayName: profile.displayName,
        avatar: profile.photos[2].value,
        profileUrl: profile._json.profileurl
      });
      await user.save();
    } else {
      // Update user info
      user.username = profile.username;
      user.displayName = profile.displayName;
      user.avatar = profile.photos[2].value;
      await user.save();
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
```

### 5. Socket.io Integration

**Server-side:**
```javascript
// app.js
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});
```

**Usage in Routes:**
```javascript
// In any route handler
router.post('/purchase', authenticateToken, async (req, res) => {
  try {
    // Purchase logic

    // Notify user in real-time
    req.io.to(`user-${req.user._id}`).emit('purchase-complete', {
      listingId: listing._id,
      status: 'success'
    });

    res.json({ success: true });
  } catch (error) {
    req.io.to(`user-${req.user._id}`).emit('purchase-error', {
      error: error.message
    });
    res.status(500).json({ error: 'Purchase failed' });
  }
});
```

### 6. Error Handling

**Middleware:**
```javascript
// middleware/errorHandler.js
const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry',
      field: Object.keys(err.keyPattern)[0]
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

### 7. Input Validation

**Using Joi:**
```javascript
// middleware/validation.js
const Joi = require('joi');

const validateListing = (req, res, next) => {
  const schema = Joi.object({
    assetId: Joi.string().required(),
    classId: Joi.string().required(),
    name: Joi.string().required(),
    marketName: Joi.string().required(),
    price: Joi.number().positive().required(),
    exterior: Joi.string().valid('Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'),
    rarity: Joi.string().required()
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details[0].message
    });
  }

  next();
};

module.exports = {
  validateListing
};
```

### 8. Marketplace Purchase Flow

**Complete Example:**
```javascript
// routes/marketplace.js
router.post('/listings/:id/purchase', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const listing = await MarketListing.findOne({
      _id: req.params.id,
      status: 'active'
    }).session(session);

    if (!listing) {
      throw new Error('Listing not found or not available');
    }

    // Check user has sufficient balance
    const user = await User.findById(req.user._id).session(session);

    if (user.wallet.balance < listing.price) {
      throw new Error('Insufficient balance');
    }

    // Deduct from buyer
    user.wallet.balance -= listing.price;
    user.wallet.pendingBalance += listing.price;
    await user.save({ session });

    // Add to seller
    const seller = await User.findById(listing.seller).session(session);
    seller.wallet.pendingBalance += listing.price;
    await seller.save({ session });

    // Update listing
    listing.status = 'pending_trade';
    listing.buyer = user._id;
    await listing.save({ session });

    // Create transaction record
    const transaction = new Transaction({
      type: 'purchase',
      buyer: user._id,
      seller: listing.seller,
      listing: listing._id,
      amount: listing.price,
      status: 'pending'
    });
    await transaction.save({ session });

    await session.commitTransaction();

    // Queue trade offer
    req.steamBotManager.queueTrade({
      listingId: listing._id,
      buyerId: user._id,
      sellerId: listing.seller,
      assetId: listing.item.assetId,
      price: listing.price
    });

    // Notify via Socket.io
    req.io.to(`user-${user._id}`).emit('purchase-initiated', {
      listingId: listing._id,
      status: 'pending_trade'
    });

    req.io.to(`user-${listing.seller}`).emit('item-sold', {
      listingId: listing._id,
      buyerId: user._id,
      price: listing.price
    });

    res.json({
      success: true,
      listing,
      transaction
    });

  } catch (error) {
    await session.abortTransaction();

    logger.error('Purchase error:', error);

    res.status(400).json({
      error: error.message
    });
  } finally {
    session.endSession();
  }
});
```

## Common Patterns

### 1. Steam API Integration

```javascript
// Get user inventory from Steam API
async function getSteamInventory(steamId, appId = 730) {
  const response = await axios.get(
    `https://steamcommunity.com/inventory/${steamId}/${appId}/2`,
    {
      params: {
        l: 'english',
        count: 5000
      }
    }
  );

  return response.data;
}
```

### 2. Trade Offer Creation

```javascript
// In Steam bot manager
async function createTradeOffer(bot, partnerSteamId, itemsToGive, itemsToReceive) {
  return new Promise((resolve, reject) => {
    bot.manager.createOffer(partnerSteamId, (err, offer) => {
      if (err) return reject(err);

      offer.addMyItems(itemsToGive);
      offer.addTheirItems(itemsToReceive);

      offer.send('Trade for marketplace item', (err2) => {
        if (err2) return reject(err2);
        resolve(offer);
      });
    });
  });
}
```

### 3. Stripe Payment Integration

```javascript
// routes/payments.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body; // Amount in cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        userId: req.user._id.toString()
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });

  } catch (error) {
    logger.error('Stripe error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});
```

## Testing Patterns

### Route Testing
```javascript
// test/marketplace.test.js
const request = require('supertest');
const app = require('../app');

describe('Marketplace Routes', () => {
  describe('GET /api/marketplace/listings', () => {
    it('should return active listings', async () => {
      const response = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/marketplace/listings', () => {
    it('should create new listing', async () => {
      const listingData = {
        assetId: 'test123',
        name: 'AK-47 | Redline',
        price: 45.99
      };

      const response = await request(app)
        .post('/api/marketplace/listings')
        .send(listingData)
        .set('Authorization', `Bearer ${validJWT}`)
        .expect(201);

      expect(response.body.assetId).toBe(listingData.assetId);
    });
  });
});
```

## Security Considerations

1. **Input Validation:** Always validate user input with Joi
2. **Authentication:** Use JWT tokens for API, Passport for Steam
3. **Rate Limiting:** Implement express-rate-limit on routes
4. **Steam Guard:** Handle Steam Guard codes properly
5. **Trade Validation:** Verify items exist and are tradable
6. **Price Manipulation:** Prevent client-side price changes
7. **SQL Injection:** Mongoose prevents this, but validate inputs
8. **XSS:** Sanitize user inputs in listings and descriptions

## Performance Optimization

1. **Database Indexes:** Index frequently queried fields
2. **Pagination:** Always paginate listing queries
3. **Populate Wisely:** Only populate necessary fields
4. **Lean Queries:** Use .lean() for read-only operations
5. **Connection Pooling:** Configure MongoDB connection pool
6. **Caching:** Consider Redis for hot data
7. **Trade Queue:** Process trades asynchronously
8. **WebSocket Events:** Throttle real-time updates

## Deployment Checklist

- [ ] Set all required environment variables
- [ ] Configure MongoDB connection with proper credentials
- [ ] Set up Steam bot accounts with shared secrets
- [ ] Configure Stripe webhook endpoints
- [ ] Set up SSL certificates
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting for production
- [ ] Set up process manager (PM2)
- [ ] Configure reverse proxy (nginx)

## Troubleshooting

### Steam Bot Not Connecting
1. Check credentials are correct
2. Verify shared/identity secrets
3. Ensure Steam Guard is properly configured
4. Check network connectivity
5. Review bot logs in services/steamBotManager.js

### MongoDB Connection Issues
1. Verify MONGODB_URI is correct
2. Check MongoDB service is running
3. Ensure credentials are valid
4. Check network/firewall settings

### Trade Offers Failing
1. Verify bot has item in inventory
2. Check item is tradable
3. Ensure partner trade URL is correct
4. Review Steam API status
5. Check bot trade limitations

### Socket.io Disconnections
1. Check CORS configuration
2. Verify client URL matches server config
3. Review WebSocket connection limits
4. Check for timeout issues

## Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Passport-Steam](https://github.com/liamcurry/passport-steam)
- [Steam API Documentation](https://steamcommunity.com/dev)
- [Socket.io Documentation](https://socket.io/docs/)
- [Stripe API Documentation](https://stripe.com/docs/api)

---

**Last Updated:** November 2025
