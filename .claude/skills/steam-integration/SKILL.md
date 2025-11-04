---
name: steam-integration
description: Specialized guide for Steam API integration including SteamUser, TradeOfferManager, Steam bot management, trade offer handling, Steam authentication, and inventory management.
---

# Steam Integration Patterns

## Purpose

Comprehensive patterns and best practices for integrating Steam API into Node.js applications, covering bot management, trade offers, authentication, and inventory operations.

## When to Use This Skill

Automatically activates when working on:
- SteamUser library integration
- TradeOfferManager for trade processing
- Steam bot account management
- Steam authentication (SteamStrategy)
- Steam inventory fetching
- Trade offer creation/acceptance
- Steam Guard handling
- Steam Community API
- steam-totp for 2FA

## Steam Libraries Overview

### Core Libraries

```javascript
// Steam bot automation
const SteamUser = require('steam-user');

// Trade offer management
const TradeOfferManager = require('steam-tradeoffer-manager');

// Steam Community API
const steamcommunity = require('steamcommunity');

// TOTP code generation
const steamTOTP = require('steam-totp');

// Steam authentication
const SteamStrategy = require('passport-steam').Strategy;
```

## Steam Bot Management

### 1. Bot Setup and Initialization

```javascript
// services/steamBotManager.js
const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');
const steamTOTP = require('steam-totp');

class SteamBotManager {
  constructor() {
    this.bots = new Map();
    this.activeBots = [];
    this.tradeQueue = [];
    this.isProcessingTrades = false;
  }

  initialize() {
    const botConfigs = this.getBotConfigs();

    botConfigs.forEach((config, index) => {
      this.createBot(config, index);
    });
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
    const client = new SteamUser({
      promptSteamGuardCode: false,
      disableScheduledMessages: false
    });

    const manager = new TradeOfferManager({
      steam: client,
      language: 'en',
      pollInterval: 10000,
      cancelTime: 15 * 60 * 1000 // 15 minutes
    });

    const bot = {
      id: `bot_${index}`,
      client,
      manager,
      config,
      isOnline: false,
      isAvailable: true,
      currentTrades: 0,
      maxTrades: 5,
      tradeOfferCount: 0,
      lastTradeOfferTime: 0
    };

    this.setupBotEventHandlers(bot);
    this.bots.set(bot.id, bot);
    this.loginBot(bot);
  }

  setupBotEventHandlers(bot) {
    const { client, manager } = bot;

    // Steam Guard authentication
    client.on('steamGuard', (domain, callback, lastCodeWrong) => {
      const code = steamTOTP.generateAuthCode(bot.config.sharedSecret);
      callback(code);
    });

    // Login successful
    client.on('loggedOn', (details) => {
      console.log(`Bot ${bot.id} logged in as ${details.vanityurl || details.accountName}`);

      bot.isOnline = true;

      // Set persona to online
      client.setPersona(SteamUser.EPersonaState.Online);

      // Play CS2
      client.gamesPlayed(730);

      // Set web session
      client.enableTwoFactor(() => {
        console.log(`Bot ${bot.id} enabled two-factor`);
      });
    });

    // Disconnected
    client.on('disconnected', (eresult, msg) => {
      console.log(`Bot ${bot.id} disconnected: ${eresult}`);
      bot.isOnline = false;
      bot.isAvailable = false;

      // Attempt to reconnect after delay
      setTimeout(() => {
        if (bot.isOnline === false) {
          this.loginBot(bot);
        }
      }, 30000);
    });

    // New trade offer received
    manager.on('newOffer', (offer) => {
      console.log(`Bot ${bot.id} received new trade offer: ${offer.id}`);

      // Log the offer
      offer.getPartnerItems((err, myItems, theirItems) => {
        if (err) {
          console.error(`Error getting items for offer ${offer.id}:`, err);
          return;
        }

        console.log(`Offer ${offer.id} - My items: ${myItems.length}, Their items: ${theirItems.length}`);

        // Determine if we should accept or decline
        // This should check against active listings in the marketplace
        this.handleNewTradeOffer(bot, offer, theirItems);
      });
    });

    // Offer state changed
    manager.on('offerList', (offers) => {
      offers.forEach(offer => {
        if (offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
          this.handleTradeCompletion(bot, offer);
        } else if (offer.state === TradeOfferManager.ETradeOfferState.Declined) {
          console.log(`Offer ${offer.id} was declined`);
        }
      });
    });

    // Session expiration
    client.on('sessionReplaced', (mobile, accountName, token) => {
      console.log(`Bot ${bot.id} session replaced`);
      this.loginBot(bot);
    });
  }

  loginBot(bot) {
    const { client, config } = bot;

    try {
      client.logOn({
        accountName: config.username,
        password: config.password,
        twoFactorCode: steamTOTP.generateAuthCode(config.sharedSecret)
      });
    } catch (error) {
      console.error(`Bot ${bot.id} login error:`, error);
    }
  }

  handleNewTradeOffer(bot, offer, theirItems) {
    // Check if offer matches any pending marketplace purchases
    // Verify items are what we expect
    // Accept or decline based on validation

    // For incoming offers (buyer taking our item)
    if (this.validateOfferAgainstListing(bot, offer, theirItems)) {
      offer.accept((err) => {
        if (err) {
          console.error(`Bot ${bot.id} failed to accept offer ${offer.id}:`, err);
        } else {
          console.log(`Bot ${bot.id} accepted offer ${offer.id}`);
        }
      });
    } else {
      offer.decline((err) => {
        if (err) {
          console.error(`Bot ${bot.id} failed to decline offer ${offer.id}:`, err);
        } else {
          console.log(`Bot ${bot.id} declined offer ${offer.id}`);
        }
      });
    }
  }

  validateOfferAgainstListing(bot, offer, theirItems) {
    // Implement validation logic:
    // 1. Check against marketplace pending_trade listings
    // 2. Verify asset IDs match
    // 3. Ensure trade partner is correct buyer
    // 4. Check for any suspicious patterns

    // This is a critical security check!
    // Return true only if offer is legitimate

    return true; // Placeholder
  }

  async createTradeOffer(bot, partnerSteamId, itemAssetIds, isBuying = false) {
    return new Promise((resolve, reject) => {
      bot.manager.createOffer(partnerSteamId, (err, offer) => {
        if (err) return reject(err);

        // Get bot's inventory
        bot.client.getInventory(730, 2, true, (err2, inventory) => {
          if (err2) return reject(err2);

          const itemsToGive = inventory.filter(item =>
            item.assetid && itemAssetIds.includes(item.assetid)
          );

          if (itemsToGive.length !== itemAssetIds.length) {
            return reject(new Error('Not all items available in bot inventory'));
          }

          if (isBuying) {
            // We're buying from user - we give nothing, they give items
            offer.addTheirItems(itemsToGive);
          } else {
            // We're selling to user - we give items, they give nothing (we receive payment elsewhere)
            offer.addMyItems(itemsToGive);
          }

          offer.send('Marketplace transaction', (err3) => {
            if (err3) return reject(err3);

            resolve(offer);
          });
        });
      });
    });
  }
}

module.exports = SteamBotManager;
```

### 2. Bot Inventory Management

```javascript
// Get bot's CS2 inventory
async function getBotInventory(bot) {
  return new Promise((resolve, reject) => {
    bot.client.getInventory(730, 2, true, (err, inventory) => {
      if (err) return reject(err);

      // Filter for tradable items
      const tradableItems = inventory.filter(item =>
        item.tradable &&
        !item.isDisabled &&
        item.marketable !== false
      );

      resolve(tradableItems);
    });
  });
}

// Find specific item by asset ID
async function findItemInInventory(bot, assetId) {
  const inventory = await getBotInventory(bot);
  return inventory.find(item => item.assetid === assetId);
}
```

### 3. Trade Offer Queue Management

```javascript
// services/tradeQueue.js
class TradeQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 3;
    this.activeTrades = new Set();
  }

  add(tradeData) {
    this.queue.push({
      ...tradeData,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: 3
    });

    if (!this.processing) {
      this.process();
    }
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Limit concurrent trades
      if (this.activeTrades.size >= this.maxConcurrent) {
        await this.sleep(1000);
        continue;
      }

      const trade = this.queue.shift();
      this.processTrade(trade);
    }

    this.processing = false;
  }

  async processTrade(trade) {
    const tradeId = trade.listingId || Math.random().toString(36).substr(2, 9);
    this.activeTrades.add(tradeId);

    try {
      await this.executeTrade(trade);
      console.log(`Trade completed: ${tradeId}`);
    } catch (error) {
      console.error(`Trade failed: ${tradeId}`, error);

      trade.attempts++;

      if (trade.attempts < trade.maxAttempts) {
        // Retry with exponential backoff
        const delay = Math.pow(2, trade.attempts) * 1000;
        setTimeout(() => {
          this.queue.push(trade);
        }, delay);
      } else {
        console.error(`Trade failed after ${trade.maxAttempts} attempts: ${tradeId}`);
        // Handle permanent failure (notify user, refund, etc.)
      }
    } finally {
      this.activeTrades.delete(tradeId);
    }
  }

  async executeTrade(trade) {
    // Implementation depends on your specific trade logic
    // This would typically:
    // 1. Find available bot
    // 2. Create trade offer
    // 3. Wait for acceptance
    // 4. Update database
    // 5. Send notifications
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = TradeQueue;
```

## Steam Authentication Patterns

### Passport.js SteamStrategy

```javascript
// routes/auth.js
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

passport.use(new SteamStrategy({
  returnURL: `${process.env.SERVER_URL}/api/auth/steam/return`,
  realm: process.env.SERVER_URL,
  apiKey: process.env.STEAM_API_KEY
}, (identifier, profile, done) => {
  // Process Steam profile
  process.nextTick(async () => {
    try {
      const steamId = identifier.split('/').pop();

      // Find or create user
      let user = await User.findOne({ steamId });

      if (!user) {
        user = new User({
          steamId,
          username: profile.username,
          displayName: profile.displayName,
          avatar: profile.photos[2]?.value || profile.photos[0]?.value,
          profileUrl: profile._json.profileurl,
          reputation: {
            positive: profile._json.commentpermission || 0,
            negative: 0,
            total: 0
          }
        });
        await user.save();
      } else {
        // Update profile info
        user.username = profile.username;
        user.displayName = profile.displayName;
        user.avatar = profile.photos[2]?.value || profile.photos[0]?.value;
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  });
}));

// Serialize/deserialize
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

// Routes
router.get('/steam', passport.authenticate('steam', { failureRedirect: '/login' }));

router.get('/steam/return',
  passport.authenticate('steam', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    res.redirect('/dashboard');
  }
);

// JWT token generation
router.get('/me', authenticateToken, async (req, res) => {
  res.json(req.user);
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}
```

## Steam Community API Patterns

### 1. Get User Inventory

```javascript
// services/steamApiService.js
const axios = require('axios');
const SteamUser = require('steam-user');

async function getSteamInventory(steamId, appId = 730, contextId = 2) {
  try {
    const url = `https://steamcommunity.com/inventory/${steamId}/${appId}/${contextId}`;
    const response = await axios.get(url, {
      params: {
        l: 'english',
        count: 5000
      },
      timeout: 10000
    });

    if (response.data.error) {
      throw new Error(`Steam API error: ${response.data.error}`);
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
}

function parseInventoryItems(inventoryData) {
  return inventoryData.descriptions.map(item => {
    const asset = inventoryData.assets.find(a => a.classid === item.classid);

    return {
      assetId: asset?.assetid,
      classId: item.classid,
      instanceId: item.instanceid,
      marketName: item.market_name,
      name: item.name,
      iconUrl: item.icon_url,
      tradable: item.tradable,
      marketable: item.marketable,
      type: item.type,
      rarity: item.tags?.find(t => t.category === 'Rarity')?.name,
      exterior: item.tags?.find(t => t.category === 'Exterior')?.name
    };
  });
}
```

### 2. Get Market Item Info

```javascript
// Get item pricing from Steam Community Market
async function getMarketPrice(marketHashName) {
  try {
    const url = 'https://steamcommunity.com/market/priceoverview/';
    const response = await axios.get(url, {
      params: {
        currency: 1, // USD
        appid: 730,
        market_hash_name: marketHashName
      },
      timeout: 10000
    });

    return {
      lowestPrice: response.data.lowest_price,
      volume: response.data.volume,
      medianPrice: response.data.median_price
    };
  } catch (error) {
    console.error('Error fetching market price:', error);
    return null;
  }
}

// Get price history
async function getPriceHistory(marketHashName) {
  try {
    const url = 'https://steamcommunity.com/market/listings/730/' + encodeURIComponent(marketHashName);
    const response = await axios.get(url, {
      headers: {
        'Referer': 'https://steamcommunity.com/market/'
      },
      timeout: 10000
    });

    // Parse the response HTML to extract price history
    // This is a simplified example - you may need more robust parsing
    return response.data;
  } catch (error) {
    console.error('Error fetching price history:', error);
    return null;
  }
}
```

## Trade Offer Patterns

### 1. Creating Trade Offers

```javascript
// Create outgoing trade offer
async function createTradeOffer(botManager, partnerSteamId, listingId, itemAssetIds) {
  const availableBot = botManager.getAvailableBot();

  if (!availableBot) {
    throw new Error('No available bots');
  }

  return new Promise((resolve, reject) => {
    availableBot.manager.createOffer(partnerSteamId, (err, offer) => {
      if (err) return reject(err);

      // Get bot's inventory
      availableBot.client.getInventory(730, 2, true, (err2, inventory) => {
        if (err2) return reject(err2);

        // Find items to trade
        const itemsToGive = inventory.filter(item =>
          itemAssetIds.includes(item.assetid) &&
          item.tradable &&
          !item.isDisabled
        );

        if (itemsToGive.length !== itemAssetIds.length) {
          offer.decline(() => {
            reject(new Error('Items not available in bot inventory'));
          });
          return;
        }

        // Add items to offer
        itemsToGive.forEach(item => {
          offer.addMyItem(item);
        });

        // Send offer
        offer.send(`Trade for listing ${listingId}`, (err3) => {
          if (err3) return reject(err3);

          console.log(`Trade offer ${offer.id} sent`);

          // Save offer ID to database
          resolve({
            offerId: offer.id,
            botId: availableBot.id,
            offer
          });
        });
      });
    });
  });
}

// Create buying offer (bot takes user's items)
async function createBuyingOffer(bot, partnerSteamId, itemAssetIds) {
  return new Promise((resolve, reject) => {
    bot.manager.createOffer(partnerSteamId, (err, offer) => {
      if (err) return reject(err);

      // We need to know what items the user will give us
      // This requires additional API calls to get user's inventory
      // or the offer will be created empty and we'll add items later

      // For now, we'll create an empty offer as placeholder
      // In practice, you'd want to get user's inventory first

      offer.send('Buying your items', (err2) => {
        if (err2) return reject(err2);
        resolve(offer);
      });
    });
  });
}
```

### 2. Handling Trade Responses

```javascript
// In bot event handler
manager.on('offerList', (offers) => {
  offers.forEach(offer => {
    const state = offer.state;

    switch (state) {
      case TradeOfferManager.ETradeOfferState.Accepted:
        this.handleAcceptedOffer(offer);
        break;

      case TradeOfferManager.ETradeOfferState.Declined:
        this.handleDeclinedOffer(offer);
        break;

      case TradeOfferManager.ETradeOfferState.Canceled:
        this.handleCanceledOffer(offer);
        break;

      case TradeOfferManager.ETradeOfferState.InEscrow:
        this.handleEscrowOffer(offer);
        break;
    }
  });
});

async function handleAcceptedOffer(offer) {
  console.log(`Offer ${offer.id} was accepted`);

  // Get confirmation of items received
  offer.getReceivedItems((err, items) => {
    if (err) {
      console.error(`Error getting items from offer ${offer.id}:`, err);
      return;
    }

    // Update database
    // Transfer items to buyer
    // Update wallet balances
    // Send notifications

    this.completeTrade(offer.id, items);
  });
}

function handleDeclinedOffer(offer) {
  console.log(`Offer ${offer.id} was declined`);

  // Refund buyer
  // Update listing status back to active
  // Notify user
}

function handleCanceledOffer(offer) {
  console.log(`Offer ${offer.id} was canceled`);

  // Similar to declined offer handling
}
```

## Steam API Rate Limiting

### Best Practices

```javascript
// Limit API calls to Steam Community
class SteamApiLimiter {
  constructor(requestsPerMinute = 60) {
    this.requestsPerMinute = requestsPerMinute;
    this.queue = [];
    this.processing = false;
    this.requestTimes = [];
  }

  async makeRequest(requestFunction) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFunction, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Check rate limit
      const now = Date.now();
      this.requestTimes = this.requestTimes.filter(time => now - time < 60000);

      if (this.requestTimes.length >= this.requestsPerMinute) {
        // Wait before next request
        const waitTime = 60000 - (now - this.requestTimes[0]) + 1000;
        await this.sleep(waitTime);
        continue;
      }

      const { requestFunction, resolve, reject } = this.queue.shift();

      try {
        const result = await requestFunction();
        this.requestTimes.push(Date.now());
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Error Handling Patterns

### Common Steam API Errors

```javascript
// Handle Steam API errors
function handleSteamError(error, context) {
  const errorMessages = {
    1: 'Invalid API key',
    2: 'Rate limit exceeded',
    8: 'Service temporarily unavailable',
    10: 'Profile is private',
    15: 'Profile not found'
  };

  const errorCode = error.code || error.statusCode;
  const message = errorMessages[errorCode] || error.message;

  console.error(`Steam API Error [${context}]:`, {
    code: errorCode,
    message,
    error: error.stack
  });

  return {
    code: errorCode,
    message,
    isRateLimit: errorCode === 2,
    isAuthError: errorCode === 1 || errorCode === 10,
    shouldRetry: [2, 8].includes(errorCode)
  };
}
```

## Security Best Practices

1. **Never hardcode Steam credentials** - Use environment variables
2. **Validate all trade offers** - Check against pending purchases
3. **Log all trades** - For audit trail and debugging
4. **Handle Steam Guard properly** - Don't log guard codes
5. **Secure shared secrets** - Use environment variables or secret management
6. **Verify item ownership** - Ensure bots actually own items before offering
7. **Monitor trade failures** - Alert on repeated failures
8. **Rate limit API calls** - Prevent being blocked by Steam
9. **Secure WebSocket connections** - Use WSS in production
10. **Validate user trade URLs** - Ensure URLs are valid Steam trade URLs

## Troubleshooting Common Issues

### Bot Won't Login
1. Check credentials are correct
2. Verify shared/identity secrets
3. Ensure Steam Guard mobile authenticator is set up
4. Check if account is limited or restricted
5. Verify network connectivity

### Trade Offers Failing
1. Verify item is tradable (not in cooldown)
2. Check item is marketable
3. Ensure bot has item in inventory
4. Verify trade URL is correct
5. Check for trade hold periods
6. Ensure trade limit not exceeded

### Rate Limiting
1. Implement request throttling
2. Add delays between operations
3. Use multiple bots with round-robin
4. Monitor Steam API response headers

### Session Expiration
1. Re-login automatically on disconnect
2. Store and reuse web session cookies
3. Handle session replacement events
4. Implement exponential backoff for reconnects

---

**Last Updated:** November 2025
